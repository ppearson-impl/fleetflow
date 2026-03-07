import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const route = await prisma.route.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    include: {
      driver: true,
      vehicle: true,
      stops: {
        orderBy: { sequence: 'asc' },
        include: { shipment: { include: { order: { include: { customer: true } }, pod: true } } },
      },
      shipments: { include: { order: { include: { customer: true } } } },
    },
  })

  if (!route) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(route)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const route = await prisma.route.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  })
  if (!route) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.route.update({
    where: { id: params.id },
    data: body,
  })

  // If dispatching, update shipment statuses and driver status
  if (body.status === 'DISPATCHED') {
    await prisma.shipment.updateMany({
      where: { routeId: params.id },
      data: { status: 'DISPATCHED' },
    })
    if (updated.driverId) {
      await prisma.driver.update({
        where: { id: updated.driverId },
        data: { status: 'ON_ROUTE' },
      })
    }
  }

  return NextResponse.json(updated)
}
