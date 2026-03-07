import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const appointments = await prisma.appointment.findMany({
    where: { tenantId: session.tenantId },
    include: { location: true },
    orderBy: { startTime: 'asc' },
    take: 200,
  })

  return NextResponse.json(appointments)
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  // Allow unauthenticated POST for partner booking portal
  const body = await req.json()

  const { locationId, companyName, contactName, contactEmail, startTime, endTime, notes, tenantId } = body

  const aptTenantId = session?.tenantId || tenantId
  if (!aptTenantId) return NextResponse.json({ error: 'Tenant required' }, { status: 400 })

  // Check capacity (max 5 per slot)
  const existing = await prisma.appointment.count({
    where: {
      locationId,
      startTime: new Date(startTime),
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
  })

  if (existing >= 5) {
    return NextResponse.json({ error: 'Slot is fully booked' }, { status: 409 })
  }

  const appointment = await prisma.appointment.create({
    data: {
      tenantId: aptTenantId,
      locationId,
      companyName,
      contactName,
      contactEmail,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      notes,
      status: 'PENDING',
    },
    include: { location: true },
  })

  return NextResponse.json(appointment, { status: 201 })
}
