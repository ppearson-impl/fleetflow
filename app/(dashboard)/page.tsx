import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ControlTowerDashboard } from '@/components/control-tower/dashboard'

async function getDashboardData(tenantId: string) {
  const [
    totalShipments,
    deliveredToday,
    lateShipmentsCount,
    activeRoutesCount,
    openExceptionsCount,
    recentExceptions,
    shipmentsByDay,
    activeDrivers,
    lateShipments,
    activeRoutes,
  ] = await Promise.all([
    prisma.shipment.count({
      where: { order: { tenantId }, status: { not: 'CANCELLED' } },
    }),
    prisma.shipment.count({
      where: {
        order: { tenantId },
        status: 'DELIVERED',
        updatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.shipment.count({
      where: {
        order: { tenantId },
        status: { in: ['DISPATCHED', 'IN_TRANSIT'] },
        plannedDate: { lt: new Date() },
      },
    }),
    prisma.route.count({
      where: { tenantId, status: { in: ['DISPATCHED', 'IN_PROGRESS'] } },
    }),
    prisma.exception.count({
      where: { shipment: { order: { tenantId } }, status: 'OPEN' },
    }),
    prisma.exception.findMany({
      where: { shipment: { order: { tenantId } }, status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { shipment: { include: { order: true } } },
    }),
    // Last 7 days deliveries
    prisma.$queryRaw`
      SELECT DATE(s."updatedAt") as date, COUNT(*)::int as count
      FROM shipments s
      JOIN orders o ON s."orderId" = o.id
      WHERE o."tenantId" = ${tenantId}
        AND s.status = 'DELIVERED'
        AND s."updatedAt" >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(s."updatedAt")
      ORDER BY date
    ` as Promise<{ date: Date; count: number }[]>,
    prisma.driver.count({ where: { tenantId, status: { in: ['AVAILABLE', 'ON_ROUTE'] } } }),
    // Detailed late shipments for drill-down
    prisma.shipment.findMany({
      where: {
        order: { tenantId },
        status: { in: ['DISPATCHED', 'IN_TRANSIT'] },
        plannedDate: { lt: new Date() },
      },
      include: {
        order: { include: { customer: true } },
        route: { include: { driver: true } },
      },
      take: 50,
    }),
    // Detailed active routes for drill-down
    prisma.route.findMany({
      where: { tenantId, status: { in: ['DISPATCHED', 'IN_PROGRESS'] } },
      include: {
        driver: true,
        vehicle: true,
        stops: { where: { status: { not: 'DELIVERED' } } },
      },
    }),
  ])

  const onTimeRate =
    totalShipments > 0
      ? Math.round(((totalShipments - lateShipmentsCount) / totalShipments) * 100)
      : 100

  return {
    kpis: {
      totalShipments,
      deliveredToday,
      lateShipments: lateShipmentsCount,
      activeRoutes: activeRoutesCount,
      openExceptions: openExceptionsCount,
      onTimeRate,
      activeDrivers,
    },
    drillDownData: {
      lateShipments,
      activeRoutes,
    },
    recentExceptions,
    shipmentsByDay,
  }
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) return null

  const data = await getDashboardData(session.tenantId)

  return <ControlTowerDashboard data={data} />
}
