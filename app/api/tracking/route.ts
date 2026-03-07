import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

// GET: fetch recent tracking events for live map
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const events = await prisma.shipmentEvent.findMany({
    where: {
      eventType: 'GPS_PING',
      shipment: { order: { tenantId: session.tenantId } },
      timestamp: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // last hour
    },
    orderBy: { timestamp: 'desc' },
    take: 200,
    include: {
      shipment: {
        include: {
          route: { include: { driver: true } },
          order: { include: { customer: true } },
        },
      },
    },
  })

  // Group by shipment — latest ping per shipment
  const byShipment = new Map<string, typeof events[0]>()
  for (const event of events) {
    if (!byShipment.has(event.shipmentId)) {
      byShipment.set(event.shipmentId, event)
    }
  }

  return NextResponse.json(Array.from(byShipment.values()))
}

// POST: receive GPS ping from driver app
export async function POST(req: NextRequest) {
  // Drivers don't need full session; just validate a token
  const body = await req.json()
  const { shipmentId, lat, lng, driverId, token } = body

  if (!shipmentId || !lat || !lng) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Log event
  await prisma.shipmentEvent.create({
    data: {
      shipmentId,
      eventType: 'GPS_PING',
      lat,
      lng,
      actor: driverId || 'driver',
      metadata: { lat, lng },
    },
  })

  // Update driver's last known location
  if (driverId) {
    await prisma.driver.updateMany({
      where: { id: driverId },
      data: { lastLat: lat, lastLng: lng, lastSeen: new Date() },
    })
  }

  return NextResponse.json({ ok: true })
}
