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
    },
  })

  // Update shipment status too
  const shipmentStatus =
    body.status === 'DELIVERED' ? 'DELIVERED' :
    body.status === 'FAILED' ? 'FAILED' :
    body.status === 'ARRIVED' ? 'IN_TRANSIT' : undefined

  if (shipmentStatus) {
    await prisma.shipment.update({
      where: { id: stop.shipmentId },
      data: { status: shipmentStatus },
    })

    await prisma.shipmentEvent.create({
      data: {
        shipmentId: stop.shipmentId,
        eventType: body.status,
        description: `Stop ${body.status.toLowerCase()} by driver`,
        actor: session.name,
      },
    })
  }

  return NextResponse.json(stop)
}
