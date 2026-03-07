import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const locations = await prisma.location.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(locations)
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const location = await prisma.location.create({
    data: { ...body, tenantId: session.tenantId },
  })
  return NextResponse.json(location, { status: 201 })
}
