import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shipment = await prisma.shipment.findFirst({
    where: { id: params.id, order: { tenantId: session.tenantId } },
    include: {
      order: { include: { customer: true } },
      route: { include: { driver: true, vehicle: true } },
      stops: { orderBy: { sequence: 'asc' } },
      deliveryItems: true,
      pod: true,
      documents: true,
      events: { orderBy: { timestamp: 'asc' } },
      exceptions: true,
    },
  })

  if (!shipment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(shipment)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const shipment = await prisma.shipment.findFirst({
    where: { id: params.id, order: { tenantId: session.tenantId } },
  })
  if (!shipment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.shipment.update({
    where: { id: params.id },
    data: body,
  })

  await prisma.shipmentEvent.create({
    data: {
      shipmentId: params.id,
      eventType: 'UPDATED',
      description: `Status updated to ${body.status || 'updated'}`,
      actor: session.name,
    },
  })

  return NextResponse.json(updated)
}
