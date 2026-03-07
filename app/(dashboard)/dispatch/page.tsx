import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DispatchClient } from './dispatch-client'

async function getDispatchData(tenantId: string) {
  const [routes, drivers, vehicles] = await Promise.all([
    prisma.route.findMany({
      where: { tenantId, status: { in: ['DRAFT', 'PLANNED', 'DISPATCHED', 'IN_PROGRESS'] } },
      include: {
        driver: true,
        vehicle: true,
        stops: {
          orderBy: { sequence: 'asc' },
          include: { shipment: { include: { order: { include: { customer: true } } } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.driver.findMany({ where: { tenantId }, orderBy: { name: 'asc' } }),
    prisma.vehicle.findMany({ where: { tenantId }, orderBy: { registration: 'asc' } }),
  ])
  return { routes, drivers, vehicles }
}

export default async function DispatchPage() {
  const session = await getSession()
  if (!session) return null
  const data = await getDispatchData(session.tenantId)
  return <DispatchClient data={data} />
}
