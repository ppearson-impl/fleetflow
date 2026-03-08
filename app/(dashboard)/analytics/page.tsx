import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AnalyticsDashboard } from './analytics-client'

async function getAnalyticsData(tenantId: string) {
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

  const baseWhere = {
    order: { tenantId },
    createdAt: { gte: startDate, lte: endDate },
  }

  const [
    allShipments,
    deliveredShipments,
    allRoutes,
    allExceptions,
    openExceptions,
    allStops,
    allDrivers,
    allCustomers,
  ] = await Promise.all([
    prisma.shipment.findMany({ where: { order: { tenantId } } }),
    prisma.shipment.findMany({
      where: { order: { tenantId }, status: 'DELIVERED' },
      include: { pod: true },
    }),
    prisma.route.findMany({
      where: { tenantId },
      include: { stops: true, driver: true },
    }),
    prisma.exception.findMany({
      where: { shipment: { order: { tenantId } }, createdAt: { gte: startDate, lte: endDate } },
    }),
    prisma.exception.findMany({
      where: { shipment: { order: { tenantId } }, status: 'OPEN' },
    }),
    prisma.stop.findMany({ where: { route: { tenantId } } }),
    prisma.driver.findMany({
      where: { tenantId },
      include: { routes: { include: { shipments: true } } },
    }),
    prisma.customer.findMany({
      where: { tenantId },
      include: { orders: { include: { shipments: true } } },
    }),
  ])

  // Count by status
  const countByStatus = (status: string) =>
    allShipments.filter((s) => s.status === status).length

  // On-time delivery %
  let onTimeDeliveryPercent = 0
  if (deliveredShipments.length > 0) {
    const onTimeCount = deliveredShipments.filter((s) => {
      if (!s.plannedDate || !s.pod) return false
      return s.pod.deliveryTime <= s.plannedDate
    }).length
    onTimeDeliveryPercent = Math.round((onTimeCount / deliveredShipments.length) * 100)
  }

  // Avg delivery time
  let avgDeliveryTimeHours = 0
  if (deliveredShipments.length > 0) {
    const total = deliveredShipments.reduce((sum, s) => {
      if (!s.pod) return sum
      return sum + (s.pod.deliveryTime.getTime() - s.createdAt.getTime())
    }, 0)
    avgDeliveryTimeHours = Math.round(total / deliveredShipments.length / (1000 * 60 * 60))
  }

  // Exceptions by type
  const byType: Record<string, number> = {}
  allExceptions.forEach((e) => {
    byType[e.type] = (byType[e.type] || 0) + 1
  })

  // Route metrics
  const avgStopsPerRoute = allRoutes.length > 0
    ? Math.round((allStops.length / allRoutes.length) * 10) / 10
    : 0

  const routesWithDist = allRoutes.filter((r) => r.distanceKm)
  const avgDistanceKm = routesWithDist.length > 0
    ? Math.round(routesWithDist.reduce((s, r) => s + (r.distanceKm || 0), 0) / routesWithDist.length)
    : 0

  // Driver performance
  const drivers = allDrivers
    .map((d) => {
      let shipmentCount = 0, successCount = 0, failedCount = 0
      d.routes.forEach((r) => r.shipments.forEach((s) => {
        shipmentCount++
        if (s.status === 'DELIVERED') successCount++
        if (s.status === 'FAILED') failedCount++
      }))
      return {
        driverId: d.id,
        driverName: d.name,
        shipmentCount,
        successCount,
        failedCount,
        successRate: shipmentCount > 0 ? Math.round((successCount / shipmentCount) * 100) : 0,
      }
    })
    .filter((d) => d.shipmentCount > 0)
    .sort((a, b) => b.shipmentCount - a.shipmentCount)

  // Customer summary
  const customers = allCustomers
    .map((c) => {
      const shipments = c.orders.flatMap((o) => o.shipments)
      return {
        customerId: c.id,
        customerName: c.name,
        shipmentCount: shipments.length,
        completedCount: shipments.filter((s) => s.status === 'DELIVERED').length,
        pendingCount: shipments.filter((s) => ['PENDING', 'PLANNED'].includes(s.status)).length,
        failedCount: shipments.filter((s) => s.status === 'FAILED').length,
      }
    })
    .filter((c) => c.shipmentCount > 0)
    .sort((a, b) => b.shipmentCount - a.shipmentCount)

  return {
    period: {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    },
    summary: {
      totalShipments: allShipments.length,
      deliveredCount: countByStatus('DELIVERED'),
      inTransitCount: countByStatus('IN_TRANSIT'),
      pendingCount: countByStatus('PENDING'),
      failedCount: countByStatus('FAILED'),
      cancelledCount: countByStatus('CANCELLED'),
      plannedCount: countByStatus('PLANNED'),
      dispatchedCount: countByStatus('DISPATCHED'),
      onTimeDeliveryPercent,
      avgDeliveryTimeHours,
    },
    exceptions: {
      total: allExceptions.length,
      byType,
      openCount: openExceptions.length,
      inProgressCount: allExceptions.filter((e) => e.status === 'IN_PROGRESS').length,
      resolvedCount: allExceptions.filter((e) => e.status === 'RESOLVED').length,
    },
    routes: {
      total: allRoutes.length,
      activeCount: allRoutes.filter((r) => ['DISPATCHED', 'IN_PROGRESS'].includes(r.status)).length,
      completedCount: allRoutes.filter((r) => r.status === 'COMPLETED').length,
      avgStopsPerRoute,
      avgDistanceKm,
    },
    drivers,
    customers,
  }
}

export default async function AnalyticsPage() {
  const session = await getSession()
  if (!session) return null

  try {
    const data = await getAnalyticsData(session.tenantId)
    return <AnalyticsDashboard data={data} />
  } catch (error) {
    console.error('Analytics page error:', error)
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <h3 className="font-semibold text-red-800">Error Loading Analytics</h3>
          <p className="text-sm text-red-700 mt-1">
            Unable to fetch analytics data. Please try again later.
          </p>
        </div>
      </div>
    )
  }
}
