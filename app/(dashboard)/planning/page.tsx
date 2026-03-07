import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PlanningBoardClient } from './planning-board-client'

async function getPlanningData(tenantId: string) {
  const [unplannedShipments, routes, drivers, vehicles] = await Promise.all([
    prisma.shipment.findMany({
      where: { order: { tenantId }, status: 'PENDING', routeId: null },
      include: { order: { include: { customer: true } } },
      orderBy: { plannedDate: 'asc' },
      take: 100,
    }),
    prisma.route.findMany({
      where: { tenantId, status: { in: ['DRAFT', 'PLANNED'] } },
      include: {
        driver: true,
        vehicle: true,
        stops: {
          orderBy: { sequence: 'asc' },
          include: { shipment: { include: { order: { include: { customer: true } } } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.driver.findMany({ where: { tenantId, status: 'AVAILABLE' } }),
    prisma.vehicle.findMany({ where: { tenantId, status: 'AVAILABLE' } }),
  ])

  return { unplannedShipments, routes, drivers, vehicles }
}

export default async function PlanningPage() {
  const session = await getSession()
  if (!session) return null
  const data = await getPlanningData(session.tenantId)
  return <PlanningBoardClient data={data} />
}
