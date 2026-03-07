import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const stop = await prisma.stop.update({
    where: { id: params.id },
    data: {
      status: body.status,
      ...(body.status === 'ARRIVED' ? { arrivedAt: new Date() } : {}),
      ...(body.status === 'DELIVERED' || body.status === 'FAILED' ? { completedAt: new Date() } : {}),
      ...(body.failureReason ? { failureReason: body.failureReason } : {}),
    },
  })

  // Cascade status to shipment
  const shipmentStatus =
    body.status === 'DELIVERED' ? 'DELIVERED' :
    body.status === 'FAILED' ? 'FAILED' :
    body.status === 'ARRIVED' ? 'IN_TRANSIT' : undefined

  if (shipmentStatus) {
    await prisma.shipment.update({
      where: { id: stop.shipmentId },
      data: { status: shipmentStatus },
    })

    const description = body.failureReason
      ? `Stop failed: ${body.failureReason.replace(/_/g, ' ').toLowerCase()}`
      : `Stop ${body.status.toLowerCase()} by driver`

    await prisma.shipmentEvent.create({
      data: {
        shipmentId: stop.shipmentId,
        eventType: body.status,
        description,
        actor: session.name,
      },
    })
  }

  return NextResponse.json(stop)
}
