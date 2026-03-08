import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import CustomersClient from './customers-client'

async function getCustomersWithOrders(tenantId: string) {
  const customers = await prisma.customer.findMany({
    where: { tenantId },
    include: {
      orders: {
        select: {
          id: true,
          reference: true,
          status: true,
          createdAt: true,
          shipments: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  return customers
}

export default async function CustomersPage() {
  const session = await getSession()
  if (!session) return null

  const customers = await getCustomersWithOrders(session.tenantId)

  return <CustomersClient customers={customers} />
}
