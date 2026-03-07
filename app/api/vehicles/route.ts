import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const vehicles = await prisma.vehicle.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { registration: 'asc' },
  })
  return NextResponse.json(vehicles)
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const vehicle = await prisma.vehicle.create({
    data: { ...body, tenantId: session.tenantId },
  })
  return NextResponse.json(vehicle, { status: 201 })
}
