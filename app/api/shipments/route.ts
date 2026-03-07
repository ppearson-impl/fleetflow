import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')

  const where: Record<string, unknown> = {
    order: { tenantId: session.tenantId },
  }
  if (status) where.status = status

  const [shipments, total] = await Promise.all([
    prisma.shipment.findMany({
      where,
      include: {
        order: { include: { customer: true } },
        route: { include: { driver: true, vehicle: true } },
        exceptions: { where: { status: 'OPEN' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.shipment.count({ where }),
  ])

  return NextResponse.json({ shipments, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['ADMIN', 'PLANNER'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { customerId, reference, origin, destination, originLat, originLng, destLat, destLng, plannedDate, items } = body

  // Find or create order
  let order = await prisma.order.findFirst({
    where: { tenantId: session.tenantId, reference },
  })

  if (!order) {
    order = await prisma.order.create({
      data: {
        tenantId: session.tenantId,
        customerId,
        reference,
        status: 'CONFIRMED',
      },
    })
  }

  const shipment = await prisma.shipment.create({
    data: {
      orderId: order.id,
      origin,
      destination,
      originLat,
      originLng,
      destLat,
      destLng,
      plannedDate: plannedDate ? new Date(plannedDate) : null,
      status: 'PENDING',
      deliveryItems: items
        ? {
            create: items.map((item: { description: string; quantity: number; weight?: number }) => ({
              description: item.description,
              quantity: item.quantity || 1,
              weight: item.weight,
            })),
          }
        : undefined,
    },
    include: { order: { include: { customer: true } } },
  })

  await prisma.shipmentEvent.create({
    data: {
      shipmentId: shipment.id,
      eventType: 'CREATED',
      description: 'Shipment created',
      actor: session.name,
    },
  })

  return NextResponse.json(shipment, { status: 201 })
}
