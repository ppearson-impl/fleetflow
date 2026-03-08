/**
 * Batch API Integration Examples
 * TypeScript/JavaScript client implementations for the Batch Operations API
 */

// ─── Client Utility ───────────────────────────────────────────────────────

interface BatchRequestConfig {
  baseUrl: string
  token?: string
}

interface BatchOperationOptions {
  retryAttempts?: number
  retryDelayMs?: number
}

class BatchAPIClient {
  private baseUrl: string
  private token?: string

  constructor(config: BatchRequestConfig) {
    this.baseUrl = config.baseUrl
    this.token = config.token
  }

  private async request(operation: object, options?: BatchOperationOptions) {
    const maxAttempts = options?.retryAttempts ?? 1
    const delayMs = options?.retryDelayMs ?? 1000
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/api/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify(operation),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(`${response.status}: ${error.error}`)
        }

        return await response.json()
      } catch (error) {
        lastError = error as Error
        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, attempt)))
        }
      }
    }

    throw lastError
  }

  async updateStatuses(
    shipmentIds: string[],
    newStatus: string,
    options?: BatchOperationOptions
  ) {
    return this.request(
      {
        operation: 'updateStatuses',
        shipmentIds,
        newStatus,
      },
      options
    )
  }

  async assignToRoutes(
    shipmentIds: string[],
    routeId: string,
    options?: BatchOperationOptions
  ) {
    return this.request(
      {
        operation: 'assignToRoutes',
        shipmentIds,
        routeId,
      },
      options
    )
  }

  async createExceptions(
    shipmentIds: string[],
    exceptionType: string,
    description: string,
    assignedTo?: string,
    options?: BatchOperationOptions
  ) {
    return this.request(
      {
        operation: 'createExceptions',
        shipmentIds,
        exceptionType,
        description,
        ...(assignedTo ? { assignedTo } : {}),
      },
      options
    )
  }

  async acknowledgeExceptions(exceptionIds: string[], options?: BatchOperationOptions) {
    return this.request(
      {
        operation: 'acknowledgeExceptions',
        exceptionIds,
      },
      options
    )
  }

  async updateStopStatus(
    stopIds: string[],
    status: string,
    options?: {
      arrivedAt?: string
      failureReason?: string
      retryAttempts?: number
      retryDelayMs?: number
    }
  ) {
    return this.request(
      {
        operation: 'updateStopStatus',
        stopIds,
        status,
        ...(options?.arrivedAt ? { arrivedAt: options.arrivedAt } : {}),
        ...(options?.failureReason ? { failureReason: options.failureReason } : {}),
      },
      { retryAttempts: options?.retryAttempts, retryDelayMs: options?.retryDelayMs }
    )
  }
}

// ─── Example 1: Dispatch multiple shipments to a route ──────────────────

async function dispatchShipmentsToRoute() {
  const client = new BatchAPIClient({ baseUrl: 'http://localhost:3000' })

  // Get shipments that need routing (in PENDING or PLANNED status)
  const shipmentIds = ['ship123', 'ship124', 'ship125']
  const routeId = 'route456'

  try {
    // Assign shipments to route
    const assignResult = await client.assignToRoutes(shipmentIds, routeId)

    console.log('Shipments assigned:', assignResult.successCount)
    console.log('Failed assignments:', assignResult.failureCount)

    if (assignResult.failureCount > 0) {
      const failed = assignResult.results.filter((r: any) => !r.success)
      console.error('Failed shipments:', failed)
      return
    }

    // Update shipment status to DISPATCHED
    const dispatchResult = await client.updateStatuses(shipmentIds, 'DISPATCHED')

    console.log('Shipments dispatched:', dispatchResult.successCount)
    console.log('Routes affected:', dispatchResult.metrics.routesAffected)
    console.log('Total time:', dispatchResult.totalTime, 'ms')
  } catch (error) {
    console.error('Error dispatching shipments:', error)
  }
}

// ─── Example 2: Handle delivery exceptions in batch ──────────────────────

async function handleDeliveryExceptions() {
  const client = new BatchAPIClient({ baseUrl: 'http://localhost:3000' })

  // Shipments that had delivery failures
  const failedShipments = ['ship789', 'ship790', 'ship791']

  try {
    // Create exceptions for failed deliveries
    const exceptionResult = await client.createExceptions(
      failedShipments,
      'CUSTOMER_UNAVAILABLE',
      'Customer not available during delivery window',
      'manager123'
    )

    console.log('Exceptions created:', exceptionResult.successCount)

    // Get exception IDs from results
    const exceptionIds = exceptionResult.results.filter((r: any) => r.success).map((r: any) => r.id)

    // Acknowledge exceptions to take ownership
    if (exceptionIds.length > 0) {
      const acknowledgeResult = await client.acknowledgeExceptions(exceptionIds)
      console.log('Exceptions acknowledged:', acknowledgeResult.successCount)
    }
  } catch (error) {
    console.error('Error handling exceptions:', error)
  }
}

// ─── Example 3: Complete deliveries with error handling ──────────────────

async function completeDeliveries() {
  const client = new BatchAPIClient({ baseUrl: 'http://localhost:3000' })

  const deliveredStops = ['stop123', 'stop124', 'stop125']
  const failedStops = ['stop126']

  try {
    // Mark stops as delivered
    const deliverResult = await client.updateStopStatus(deliveredStops, 'DELIVERED')

    console.log('Delivered stops:', deliverResult.successCount)

    // Mark failed stops with reason
    const failResult = await client.updateStopStatus(failedStops, 'FAILED', {
      failureReason: 'Customer refused shipment - goods damaged',
    })

    console.log('Failed stops:', failResult.successCount)
    console.log('Total stops updated:', deliverResult.successCount + failResult.successCount)
  } catch (error) {
    console.error('Error updating stop statuses:', error)
  }
}

// ─── Example 4: Retry failed operations ──────────────────────────────────

async function retryFailedOperations() {
  const client = new BatchAPIClient({ baseUrl: 'http://localhost:3000' })

  const shipmentIds = ['ship201', 'ship202', 'ship203']

  try {
    // Try to update with retries (exponential backoff)
    const result = await client.updateStatuses(shipmentIds, 'PLANNED', {
      retryAttempts: 3,
      retryDelayMs: 500,
    })

    // Find failed operations
    const failedIds = result.results.filter((r: any) => !r.success).map((r: any) => r.id)

    if (failedIds.length > 0) {
      console.warn('Failed operations:', failedIds)

      // Log the errors for debugging
      const errors = result.results
        .filter((r: any) => !r.success)
        .forEach((r: any) => {
          console.error(`Shipment ${r.id}: ${r.error}`)
        })
    }

    console.log('Final results:', {
      success: result.successCount,
      failed: result.failureCount,
      timeMs: result.totalTime,
    })
  } catch (error) {
    console.error('Batch operation failed:', error)
  }
}

// ─── Example 5: Process large import in chunks ──────────────────────────

async function processBatchesInChunks(allShipmentIds: string[], routeId: string) {
  const client = new BatchAPIClient({ baseUrl: 'http://localhost:3000' })

  const CHUNK_SIZE = 200 // Process 200 shipments at a time
  const chunks = []

  for (let i = 0; i < allShipmentIds.length; i += CHUNK_SIZE) {
    chunks.push(allShipmentIds.slice(i, i + CHUNK_SIZE))
  }

  console.log(`Processing ${allShipmentIds.length} shipments in ${chunks.length} chunks`)

  const results = []

  for (let i = 0; i < chunks.length; i++) {
    try {
      const chunk = chunks[i]
      console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} items)`)

      const result = await client.assignToRoutes(chunk, routeId, {
        retryAttempts: 2,
        retryDelayMs: 1000,
      })

      results.push({
        chunk: i + 1,
        success: result.successCount,
        failed: result.failureCount,
        timeMs: result.totalTime,
      })

      // Add delay between chunks to avoid overwhelming the server
      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    } catch (error) {
      console.error(`Error processing chunk ${i + 1}:`, error)
      results.push({
        chunk: i + 1,
        error: String(error),
      })
    }
  }

  console.log('Batch processing complete:', results)
  return results
}

// ─── Example 6: Monitor batch operation progress ──────────────────────────

interface ProgressCallback {
  (progress: { success: number; failed: number; timeMs: number }): void
}

async function monitorBatchOperation(
  shipmentIds: string[],
  newStatus: string,
  onProgress?: ProgressCallback
) {
  const client = new BatchAPIClient({ baseUrl: 'http://localhost:3000' })

  const startTime = Date.now()

  const result = await client.updateStatuses(shipmentIds, newStatus)

  const progress = {
    success: result.successCount,
    failed: result.failureCount,
    timeMs: result.totalTime,
  }

  if (onProgress) {
    onProgress(progress)
  }

  // Detailed logging
  if (result.failureCount > 0) {
    const failedItems = result.results.filter((r: any) => !r.success)
    console.log('Failed operations:')
    failedItems.forEach((item: any) => {
      console.log(`  - ${item.id}: ${item.error}`)
    })
  }

  console.log(
    `Operation completed: ${progress.success}/${shipmentIds.length} successful in ${progress.timeMs}ms`
  )

  return result
}

// ─── Example 7: Validate inputs before batching ──────────────────────────

interface ValidationError {
  field: string
  error: string
}

function validateBatchRequest(operation: string, data: any): ValidationError[] {
  const errors: ValidationError[] = []

  if (!operation) {
    errors.push({ field: 'operation', error: 'Operation is required' })
  }

  switch (operation) {
    case 'updateStatuses':
      if (!Array.isArray(data.shipmentIds) || data.shipmentIds.length === 0) {
        errors.push({ field: 'shipmentIds', error: 'Must be a non-empty array' })
      }
      if (!data.newStatus) {
        errors.push({ field: 'newStatus', error: 'New status is required' })
      }
      break

    case 'assignToRoutes':
      if (!Array.isArray(data.shipmentIds) || data.shipmentIds.length === 0) {
        errors.push({ field: 'shipmentIds', error: 'Must be a non-empty array' })
      }
      if (!data.routeId) {
        errors.push({ field: 'routeId', error: 'Route ID is required' })
      }
      break

    case 'createExceptions':
      if (!Array.isArray(data.shipmentIds) || data.shipmentIds.length === 0) {
        errors.push({ field: 'shipmentIds', error: 'Must be a non-empty array' })
      }
      if (!data.exceptionType) {
        errors.push({ field: 'exceptionType', error: 'Exception type is required' })
      }
      if (!data.description || data.description.length < 5) {
        errors.push({ field: 'description', error: 'Description must be at least 5 characters' })
      }
      break
  }

  return errors
}

// ─── Example 8: React Hook for batch operations ──────────────────────────

/**
 * React Hook example for using batch operations
 * Usage in a component:
 *
 * const { execute, loading, error, result } = useBatchOperation();
 *
 * const handleDispatch = async () => {
 *   const result = await execute('updateStatuses', {
 *     shipmentIds: selectedIds,
 *     newStatus: 'DISPATCHED'
 *   });
 *   if (result.failureCount === 0) {
 *     showSuccess('All shipments dispatched');
 *   }
 * };
 */

interface UseBatchOperationReturn {
  execute: (operation: string, data: any) => Promise<any>
  loading: boolean
  error: string | null
  result: any | null
}

// This is a pseudo-implementation showing the pattern
function useBatchOperation(): UseBatchOperationReturn {
  // In a real React component, you would use useState and useEffect
  // This is just to show the API design pattern

  const execute = async (operation: string, data: any) => {
    const client = new BatchAPIClient({ baseUrl: 'http://localhost:3000' })

    switch (operation) {
      case 'updateStatuses':
        return client.updateStatuses(data.shipmentIds, data.newStatus)
      case 'assignToRoutes':
        return client.assignToRoutes(data.shipmentIds, data.routeId)
      case 'createExceptions':
        return client.createExceptions(
          data.shipmentIds,
          data.exceptionType,
          data.description,
          data.assignedTo
        )
      default:
        throw new Error('Unknown operation')
    }
  }

  return {
    execute,
    loading: false,
    error: null,
    result: null,
  }
}

// ─── Export for use in other modules ──────────────────────────────────────

export {
  BatchAPIClient,
  dispatchShipmentsToRoute,
  handleDeliveryExceptions,
  completeDeliveries,
  retryFailedOperations,
  processBatchesInChunks,
  monitorBatchOperation,
  validateBatchRequest,
  useBatchOperation,
  type BatchRequestConfig,
  type BatchOperationOptions,
  type ProgressCallback,
  type ValidationError,
  type UseBatchOperationReturn,
}
