import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const routes = await prisma.route.findMany({
    where: { tenantId: session.tenantId },
    include: {
      driver: true,
      vehicle: true,
      stops: {
        orderBy: { sequence: 'asc' },
        include: { shipment: { include: { order: { include: { customer: true } } } } },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json(routes)
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['ADMIN', 'PLANNER'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, plannedStart, driverId, vehicleId, shipmentIds } = body

  const route = await prisma.route.create({
    data: {
      tenantId: session.tenantId,
      name: name || `Route ${new Date().toLocaleDateString()}`,
      plannedStart: plannedStart ? new Date(plannedStart) : null,
      driverId: driverId || null,
      vehicleId: vehicleId || null,
      status: 'DRAFT',
    },
  })

  // Add stops for each shipment
  if (shipmentIds && shipmentIds.length > 0) {
    for (let i = 0; i < shipmentIds.length; i++) {
      const shipment = await prisma.shipment.findUnique({ where: { id: shipmentIds[i] } })
      if (shipment) {
        await prisma.stop.create({
          data: {
            routeId: route.id,
            shipmentId: shipment.id,
            sequence: i + 1,
            location: shipment.destination,
            lat: shipment.destLat,
            lng: shipment.destLng,
          },
        })
        await prisma.shipment.update({
          where: { id: shipment.id },
          data: { routeId: route.id, status: 'PLANNED' },
        })
      }
    }
  }

  return NextResponse.json(route, { status: 201 })
}
