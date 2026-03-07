import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { nearestNeighbour, estimateRouteDistance } from '@/lib/planner/nearest-neighbour'

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { routeId } = await req.json()

  const route = await prisma.route.findFirst({
    where: { id: routeId, tenantId: session.tenantId },
    include: {
      stops: { include: { shipment: true } },
    },
  })

  if (!route) return NextResponse.json({ error: 'Route not found' }, { status: 404 })

  const stopsWithCoords = route.stops
    .filter((s) => s.lat != null && s.lng != null)
    .map((s) => ({
      id: s.id,
      lat: s.lat!,
      lng: s.lng!,
      shipmentId: s.shipmentId,
      location: s.location,
      timeWindowStart: s.timeWindowStart,
      timeWindowEnd: s.timeWindowEnd,
    }))

  if (stopsWithCoords.length === 0) {
    return NextResponse.json({ error: 'No stops with coordinates' }, { status: 400 })
  }

  const ordered = nearestNeighbour(stopsWithCoords)
  const distanceKm = estimateRouteDistance(stopsWithCoords)

  // Update sequences
  for (let i = 0; i < ordered.length; i++) {
    await prisma.stop.update({
      where: { id: ordered[i].id },
      data: { sequence: i + 1 },
    })
  }

  await prisma.route.update({
    where: { id: routeId },
    data: { distanceKm, estimatedDuration: Math.round(distanceKm * 1.5) },
  })

  return NextResponse.json({ ordered, distanceKm })
}
