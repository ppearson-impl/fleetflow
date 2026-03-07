import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const drivers = await prisma.driver.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(drivers)
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const driver = await prisma.driver.create({
    data: { ...body, tenantId: session.tenantId },
  })
  return NextResponse.json(driver, { status: 201 })
}
