import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ShipmentDetailClient from './shipment-detail-client'

async function getShipmentDetail(shipmentId: string, tenantId: string) {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: {
      order: {
        include: {
          customer: true,
        },
      },
      route: {
        include: {
          driver: true,
          vehicle: true,
          stops: {
            include: {
              shipment: {
                include: {
                  order: {
                    include: {
                      customer: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      deliveryItems: true,
      pod: true,
      documents: true,
      stops: {
        orderBy: { sequence: 'asc' },
      },
      events: {
        orderBy: { timestamp: 'asc' },
      },
      exceptions: true,
    },
  })

  // Check tenant access through order
  if (!shipment || shipment.order.tenantId !== tenantId) {
    notFound()
  }

  return shipment
}

export default async function ShipmentDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return null

  const shipment = await getShipmentDetail(params.id, session.tenantId)

  return <ShipmentDetailClient shipment={shipment} />
}
