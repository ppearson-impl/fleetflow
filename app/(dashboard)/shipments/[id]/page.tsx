import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ShipmentDetailClient from './shipment-detail-client'

export default async function ShipmentDetailPage({ params }: { params: { id: string } }) {
  // Get session
  const session = await getSession()
  if (!session) return notFound()

  // Fetch shipment with all related data
  const shipment = await prisma.shipment.findUnique({
    where: { id: params.id },
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
        },
      },
      stops: true,
      deliveryItems: true,
      pod: true,
      documents: true,
      events: {
        orderBy: { timestamp: 'desc' },
      },
      exceptions: true,
    },
  })

  if (!shipment) return notFound()

  // Check tenant access
  if (shipment.order.tenantId !== session.tenantId) return notFound()

  // Convert Prisma objects to plain objects for client component
  const shipmentData = {
    ...shipment,
    plannedDate: shipment.plannedDate ? new Date(shipment.plannedDate) : null,
    events: shipment.events.map((e) => ({
      ...e,
      timestamp: new Date(e.timestamp),
    })),
    pod: shipment.pod
      ? {
          ...shipment.pod,
          deliveryTime: new Date(shipment.pod.deliveryTime),
        }
      : null,
    exceptions: shipment.exceptions.map((e) => ({
      ...e,
      createdAt: new Date(e.createdAt),
      resolvedAt: e.resolvedAt ? new Date(e.resolvedAt) : null,
    })),
    stops: shipment.stops.map((s) => ({
      ...s,
      timeWindowStart: s.timeWindowStart ? new Date(s.timeWindowStart) : null,
      timeWindowEnd: s.timeWindowEnd ? new Date(s.timeWindowEnd) : null,
    })),
  }

  return <ShipmentDetailClient shipment={shipmentData} />
}
