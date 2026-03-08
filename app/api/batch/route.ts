import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

// ─── Type Definitions ───────────────────────────────────────────────────────

interface BatchOperation {
  operation: string
  [key: string]: unknown
}

interface OperationResult {
  id: string
  success: boolean
  error?: string
}

interface BatchResponse {
  operation: string
  successCount: number
  failureCount: number
  totalTime: number
  results: OperationResult[]
  metrics?: Record<string, unknown>
}

interface ErrorResponse {
  error: string
  code: string
  details?: unknown
}

// ─── Valid Status Transitions ───────────────────────────────────────────────

const VALID_SHIPMENT_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PLANNED', 'CANCELLED'],
  PLANNED: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['IN_TRANSIT', 'FAILED', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED', 'FAILED'],
  DELIVERED: [],
  FAILED: ['PENDING', 'PLANNED'],
  CANCELLED: [],
}

const VALID_STOP_STATUSES = ['PENDING', 'ARRIVED', 'DELIVERED', 'FAILED', 'SKIPPED']

// ─── Validation Utilities ───────────────────────────────────────────────────

async function validateTenantAccess(tenantId: string, shipmentId: string): Promise<boolean> {
  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      order: { tenantId },
    },
  })
  return !!shipment
}

function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
  const validTransitions = VALID_SHIPMENT_TRANSITIONS[currentStatus] || []
  return validTransitions.includes(newStatus)
}

function validateShipmentIds(ids: unknown): { valid: boolean; data?: string[]; error?: string } {
  if (!Array.isArray(ids)) {
    return { valid: false, error: 'shipmentIds must be an array' }
  }
  if (ids.length === 0) {
    return { valid: false, error: 'shipmentIds cannot be empty' }
  }
  if (ids.length > 1000) {
    return { valid: false, error: 'Maximum 1000 shipments per batch operation' }
  }
  if (!ids.every((id) => typeof id === 'string' && id.length > 0)) {
    return { valid: false, error: 'All shipment IDs must be non-empty strings' }
  }
  return { valid: true, data: ids as string[] }
}

function validateRequestBody(body: unknown): { valid: boolean; data?: BatchOperation; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' }
  }

  const batchOp = body as Record<string, unknown>
  if (!batchOp.operation || typeof batchOp.operation !== 'string') {
    return { valid: false, error: 'operation field is required and must be a string' }
  }

  const validOperations = ['updateStatuses', 'assignToRoutes', 'createExceptions', 'acknowledgeExceptions', 'updateStopStatus']
  if (!validOperations.includes(batchOp.operation)) {
    return {
      valid: false,
      error: `Invalid operation. Must be one of: ${validOperations.join(', ')}`,
    }
  }

  return { valid: true, data: batchOp as BatchOperation }
}

// ─── Operation Handlers ─────────────────────────────────────────────────────

/**
 * Update multiple shipments to a new status with state transition validation
 */
async function handleUpdateStatuses(
  body: BatchOperation,
  tenantId: string,
  userName: string
): Promise<{ result: OperationResult[]; metrics: Record<string, unknown> }> {
  const results: OperationResult[] = []
  const affectedRoutes = new Set<string>()
  let updatedCount = 0

  const shipmentIdsValidation = validateShipmentIds(body.shipmentIds)
  if (!shipmentIdsValidation.valid) {
    throw new Error(shipmentIdsValidation.error)
  }

  if (!body.newStatus || typeof body.newStatus !== 'string') {
    throw new Error('newStatus field is required and must be a string')
  }

  const newStatus = body.newStatus as string

  const shipments = await prisma.shipment.findMany({
    where: {
      id: { in: shipmentIdsValidation.data },
      order: { tenantId },
    },
    select: { id: true, status: true, routeId: true },
  })

  for (const shipment of shipments) {
    try {
      // Validate status transition
      if (!isValidStatusTransition(shipment.status, newStatus)) {
        results.push({
          id: shipment.id,
          success: false,
          error: `Invalid transition from ${shipment.status} to ${newStatus}`,
        })
        continue
      }

      // Update shipment
      await prisma.shipment.update({
        where: { id: shipment.id },
        data: { status: newStatus as any },
      })

      // Track affected routes
      if (shipment.routeId) {
        affectedRoutes.add(shipment.routeId)
      }

      // Create audit event
      await prisma.shipmentEvent.create({
        data: {
          shipmentId: shipment.id,
          eventType: 'STATUS_CHANGED',
          description: `Status changed from ${shipment.status} to ${newStatus}`,
          actor: userName,
          metadata: { from: shipment.status, to: newStatus },
        },
      })

      results.push({ id: shipment.id, success: true })
      updatedCount++
    } catch (error) {
      results.push({
        id: shipment.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return {
    result: results,
    metrics: {
      shipmentsUpdated: updatedCount,
      routesAffected: affectedRoutes.size,
      failedOperations: results.filter((r) => !r.success).length,
    },
  }
}

/**
 * Assign multiple shipments to routes
 */
async function handleAssignToRoutes(
  body: BatchOperation,
  tenantId: string,
  userName: string
): Promise<{ result: OperationResult[]; metrics: Record<string, unknown> }> {
  const results: OperationResult[] = []
  let assignedCount = 0

  const shipmentIdsValidation = validateShipmentIds(body.shipmentIds)
  if (!shipmentIdsValidation.valid) {
    throw new Error(shipmentIdsValidation.error)
  }

  if (!body.routeId || typeof body.routeId !== 'string') {
    throw new Error('routeId field is required and must be a string')
  }

  const routeId = body.routeId as string

  // Verify route exists and belongs to tenant
  const route = await prisma.route.findFirst({
    where: { id: routeId, tenantId },
  })

  if (!route) {
    throw new Error('Route not found or does not belong to this tenant')
  }

  const shipments = await prisma.shipment.findMany({
    where: {
      id: { in: shipmentIdsValidation.data },
      order: { tenantId },
    },
    select: { id: true, status: true, destination: true, destLat: true, destLng: true },
  })

  // Get max sequence for the route
  const maxSequence = await prisma.stop.aggregate({
    where: { routeId },
    _max: { sequence: true },
  })

  let nextSequence = (maxSequence._max.sequence || 0) + 1

  for (const shipment of shipments) {
    try {
      // Check if shipment is in a valid state for assignment
      if (!['PENDING', 'PLANNED'].includes(shipment.status)) {
        results.push({
          id: shipment.id,
          success: false,
          error: `Shipment status ${shipment.status} cannot be assigned to route`,
        })
        continue
      }

      // Update shipment to route
      await prisma.shipment.update({
        where: { id: shipment.id },
        data: { routeId, status: 'PLANNED' },
      })

      // Create stop for this shipment
      await prisma.stop.create({
        data: {
          routeId,
          shipmentId: shipment.id,
          sequence: nextSequence,
          location: shipment.destination,
          lat: shipment.destLat || undefined,
          lng: shipment.destLng || undefined,
          status: 'PENDING',
        },
      })

      // Create audit event
      await prisma.shipmentEvent.create({
        data: {
          shipmentId: shipment.id,
          eventType: 'ASSIGNED_TO_ROUTE',
          description: `Assigned to route ${routeId}`,
          actor: userName,
          metadata: { routeId, sequence: nextSequence },
        },
      })

      results.push({ id: shipment.id, success: true })
      assignedCount++
      nextSequence++
    } catch (error) {
      results.push({
        id: shipment.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return {
    result: results,
    metrics: {
      shipmentsAssigned: assignedCount,
      targetRoute: routeId,
      failedOperations: results.filter((r) => !r.success).length,
    },
  }
}

/**
 * Create exceptions for multiple shipments
 */
async function handleCreateExceptions(
  body: BatchOperation,
  tenantId: string,
  userName: string
): Promise<{ result: OperationResult[]; metrics: Record<string, unknown> }> {
  const results: OperationResult[] = []
  let createdCount = 0

  const shipmentIdsValidation = validateShipmentIds(body.shipmentIds)
  if (!shipmentIdsValidation.valid) {
    throw new Error(shipmentIdsValidation.error)
  }

  if (!body.exceptionType || typeof body.exceptionType !== 'string') {
    throw new Error('exceptionType field is required and must be a string')
  }

  if (!body.description || typeof body.description !== 'string') {
    throw new Error('description field is required and must be a string')
  }

  const exceptionType = body.exceptionType as string
  const description = body.description as string

  const validExceptionTypes = [
    'LATE_DELIVERY',
    'MISSED_TIME_WINDOW',
    'VEHICLE_BREAKDOWN',
    'DRIVER_INCIDENT',
    'CUSTOMER_UNAVAILABLE',
    'DAMAGED_GOODS',
    'OTHER',
  ]

  if (!validExceptionTypes.includes(exceptionType)) {
    throw new Error(`Invalid exception type. Must be one of: ${validExceptionTypes.join(', ')}`)
  }

  const shipments = await prisma.shipment.findMany({
    where: {
      id: { in: shipmentIdsValidation.data },
      order: { tenantId },
    },
    select: { id: true },
  })

  for (const shipment of shipments) {
    try {
      // Check if exception already exists for this shipment
      const existingException = await prisma.exception.findFirst({
        where: { shipmentId: shipment.id, status: 'OPEN' },
      })

      if (existingException) {
        results.push({
          id: shipment.id,
          success: false,
          error: 'An open exception already exists for this shipment',
        })
        continue
      }

      // Create exception
      await prisma.exception.create({
        data: {
          shipmentId: shipment.id,
          type: exceptionType as any,
          description,
          status: 'OPEN',
          assignedTo: body.assignedTo ? (body.assignedTo as string) : undefined,
        },
      })

      results.push({ id: shipment.id, success: true })
      createdCount++
    } catch (error) {
      results.push({
        id: shipment.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return {
    result: results,
    metrics: {
      exceptionsCreated: createdCount,
      exceptionType,
      failedOperations: results.filter((r) => !r.success).length,
    },
  }
}

/**
 * Batch acknowledge exceptions
 */
async function handleAcknowledgeExceptions(
  body: BatchOperation,
  tenantId: string,
  userName: string
): Promise<{ result: OperationResult[]; metrics: Record<string, unknown> }> {
  const results: OperationResult[] = []
  let acknowledgedCount = 0

  if (!Array.isArray(body.exceptionIds) || body.exceptionIds.length === 0) {
    throw new Error('exceptionIds must be a non-empty array')
  }

  if (body.exceptionIds.length > 1000) {
    throw new Error('Maximum 1000 exceptions per batch operation')
  }

  const exceptions = await prisma.exception.findMany({
    where: {
      id: { in: body.exceptionIds as string[] },
      shipment: { order: { tenantId } },
    },
    select: { id: true, status: true, shipmentId: true },
  })

  for (const exception of exceptions) {
    try {
      // Validate status transition
      if (exception.status === 'CLOSED') {
        results.push({
          id: exception.id,
          success: false,
          error: 'Cannot acknowledge a closed exception',
        })
        continue
      }

      // Update exception status
      await prisma.exception.update({
        where: { id: exception.id },
        data: {
          status: 'IN_PROGRESS',
          assignedTo: userName,
        },
      })

      results.push({ id: exception.id, success: true })
      acknowledgedCount++
    } catch (error) {
      results.push({
        id: exception.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return {
    result: results,
    metrics: {
      exceptionsAcknowledged: acknowledgedCount,
      failedOperations: results.filter((r) => !r.success).length,
    },
  }
}

/**
 * Update multiple stops with a status
 */
async function handleUpdateStopStatus(
  body: BatchOperation,
  tenantId: string,
  userName: string
): Promise<{ result: OperationResult[]; metrics: Record<string, unknown> }> {
  const results: OperationResult[] = []
  let updatedCount = 0

  if (!Array.isArray(body.stopIds) || body.stopIds.length === 0) {
    throw new Error('stopIds must be a non-empty array')
  }

  if (body.stopIds.length > 1000) {
    throw new Error('Maximum 1000 stops per batch operation')
  }

  if (!body.status || typeof body.status !== 'string') {
    throw new Error('status field is required and must be a string')
  }

  const status = body.status as string

  if (!VALID_STOP_STATUSES.includes(status)) {
    throw new Error(`Invalid stop status. Must be one of: ${VALID_STOP_STATUSES.join(', ')}`)
  }

  const stops = await prisma.stop.findMany({
    where: {
      id: { in: body.stopIds as string[] },
      route: { tenantId },
    },
    select: { id: true, shipmentId: true },
  })

  const now = new Date()

  for (const stop of stops) {
    try {
      // Prepare update data
      const updateData: Record<string, unknown> = { status }

      if (status === 'ARRIVED' && body.arrivedAt) {
        updateData.arrivedAt = new Date(body.arrivedAt as string)
      }

      if (['DELIVERED', 'FAILED'].includes(status)) {
        updateData.completedAt = now
        if (status === 'FAILED' && body.failureReason) {
          updateData.failureReason = body.failureReason as string
        }
      }

      // Update stop
      await prisma.stop.update({
        where: { id: stop.id },
        data: updateData,
      })

      // Create audit event
      await prisma.shipmentEvent.create({
        data: {
          shipmentId: stop.shipmentId,
          eventType: 'STOP_STATUS_CHANGED',
          description: `Stop status changed to ${status}`,
          actor: userName,
          metadata: { stopId: stop.id, status },
        },
      })

      results.push({ id: stop.id, success: true })
      updatedCount++
    } catch (error) {
      results.push({
        id: stop.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return {
    result: results,
    metrics: {
      stopsUpdated: updatedCount,
      targetStatus: status,
      failedOperations: results.filter((r) => !r.success).length,
    },
  }
}

// ─── Main Handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse<BatchResponse | ErrorResponse>> {
  const startTime = Date.now()

  try {
    // Authentication check
    const session = await getSessionFromRequest(req)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Authorization check - only admin and planner can perform batch operations
    if (!['ADMIN', 'PLANNER'].includes(session.role)) {
      return NextResponse.json(
        { error: 'Forbidden - batch operations require ADMIN or PLANNER role', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body', code: 'INVALID_JSON' },
        { status: 400 }
      )
    }

    const bodyValidation = validateRequestBody(body)
    if (!bodyValidation.valid) {
      return NextResponse.json(
        { error: bodyValidation.error || 'Invalid request', code: 'INVALID_REQUEST' },
        { status: 422 }
      )
    }

    const batchOp = bodyValidation.data!
    let operationResults: OperationResult[] = []
    let metrics: Record<string, unknown> = {}

    // Route to appropriate handler
    switch (batchOp.operation) {
      case 'updateStatuses': {
        const { result, metrics: operationMetrics } = await handleUpdateStatuses(
          batchOp,
          session.tenantId,
          session.name
        )
        operationResults = result
        metrics = operationMetrics
        break
      }

      case 'assignToRoutes': {
        const { result, metrics: operationMetrics } = await handleAssignToRoutes(
          batchOp,
          session.tenantId,
          session.name
        )
        operationResults = result
        metrics = operationMetrics
        break
      }

      case 'createExceptions': {
        const { result, metrics: operationMetrics } = await handleCreateExceptions(
          batchOp,
          session.tenantId,
          session.name
        )
        operationResults = result
        metrics = operationMetrics
        break
      }

      case 'acknowledgeExceptions': {
        const { result, metrics: operationMetrics } = await handleAcknowledgeExceptions(
          batchOp,
          session.tenantId,
          session.name
        )
        operationResults = result
        metrics = operationMetrics
        break
      }

      case 'updateStopStatus': {
        const { result, metrics: operationMetrics } = await handleUpdateStopStatus(
          batchOp,
          session.tenantId,
          session.name
        )
        operationResults = result
        metrics = operationMetrics
        break
      }

      default:
        return NextResponse.json(
          { error: 'Unknown operation', code: 'UNKNOWN_OPERATION' },
          { status: 422 }
        )
    }

    const totalTime = Date.now() - startTime
    const successCount = operationResults.filter((r) => r.success).length
    const failureCount = operationResults.filter((r) => !r.success).length

    return NextResponse.json(
      {
        operation: batchOp.operation,
        successCount,
        failureCount,
        totalTime,
        results: operationResults,
        metrics,
      },
      { status: 200 }
    )
  } catch (error) {
    const totalTime = Date.now() - startTime

    console.error('[Batch API Error]', error)

    if (error instanceof Error && error.message.includes('Invalid')) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'VALIDATION_ERROR',
        },
        { status: 422 }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      { status: 500 }
    )
  }
}

// ─── Request Options ──────────────────────────────────────────────────────

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({ allow: ['POST'] }, { status: 200 })
}
