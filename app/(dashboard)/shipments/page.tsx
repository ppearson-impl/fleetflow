import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ShipmentsClient } from './shipments-client'

async function getShipments(tenantId: string) {
  const [shipments, customers] = await Promise.all([
    prisma.shipment.findMany({
      where: { order: { tenantId } },
      include: {
        order: { include: { customer: true } },
        route: { include: { driver: true } },
        exceptions: { where: { status: 'OPEN' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.customer.findMany({ where: { tenantId }, orderBy: { name: 'asc' } }),
  ])
  return { shipments, customers }
}

export default async function ShipmentsPage() {
  const session = await getSession()
  if (!session) return null
  const data = await getShipments(session.tenantId)
  return <ShipmentsClient data={data} userRole={session.role} />
}
