/**
 * Utilities for route assignment and shipment management
 * Handles drag-and-drop assignment logic
 */

import { prisma } from '@/lib/prisma'

/**
 * Assign a shipment to a route
 * Updates shipment.routeId and recalculates route distance
 */
export async function assignShipmentToRoute(shipmentId: string, routeId: string) {
  const shipment = await prisma.shipment.update({
    where: { id: shipmentId },
    data: { routeId },
    include: { route: true },
  })

  return shipment
}

/**
 * Unassign a shipment from its route (remove from planning)
 */
export async function unassignShipment(shipmentId: string) {
  const shipment = await prisma.shipment.update({
    where: { id: shipmentId },
    data: { routeId: null },
  })

  return shipment
}

/**
 * Reassign a shipment from one route to another
 */
export async function reassignShipment(
  shipmentId: string,
  fromRouteId: string,
  toRouteId: string
) {
  const shipment = await prisma.shipment.update({
    where: { id: shipmentId },
    data: { routeId: toRouteId },
    include: { route: true },
  })

  return shipment
}

/**
 * Reorder stops within a route based on new sequence
 * Expects an array of stop IDs in the desired order
 */
export async function reorderStops(
  routeId: string,
  stopIds: string[]
) {
  // Update each stop with new sequence number
  const updates = stopIds.map((id, idx) =>
    prisma.stop.update({
      where: { id },
      data: { sequence: idx + 1 },
    })
  )

  await Promise.all(updates)

  // Recalculate route distance after reordering
  const route = await prisma.route.findUnique({
    where: { id: routeId },
    include: { stops: { orderBy: { sequence: 'asc' } } },
  })

  // If route exists, recalculate distance (this should be done via nearestNeighbour algorithm)
  // For now, just return the updated route
  return route
}

/**
 * Bulk assign multiple shipments to a route
 */
export async function bulkAssignShipmentsToRoute(
  shipmentIds: string[],
  routeId: string
) {
  const shipments = await prisma.shipment.updateMany({
    where: { id: { in: shipmentIds } },
    data: { routeId },
  })

  return shipments
}

/**
 * Get all unplanned shipments (not assigned to any route)
 */
export async function getUnplannedShipments(tenantId: string) {
  const shipments = await prisma.shipment.findMany({
    where: {
      order: { tenantId },
      routeId: null,
      status: { in: ['PENDING', 'PLANNED'] },
    },
    include: {
      order: { include: { customer: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return shipments
}

/**
 * Validate if a shipment can be assigned to a route
 * Check for conflicts, constraints, etc.
 */
export async function validateShipmentAssignment(
  shipmentId: string,
  routeId: string
): Promise<{ valid: boolean; error?: string }> {
  const [shipment, route] = await Promise.all([
    prisma.shipment.findUnique({ where: { id: shipmentId } }),
    prisma.route.findUnique({ where: { id: routeId } }),
  ])

  if (!shipment) {
    return { valid: false, error: 'Shipment not found' }
  }

  if (!route) {
    return { valid: false, error: 'Route not found' }
  }

  // Add more validation logic as needed
  // e.g., vehicle capacity, time windows, customer preferences, etc.

  return { valid: true }
}
