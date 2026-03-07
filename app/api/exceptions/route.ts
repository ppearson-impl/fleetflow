import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const exceptions = await prisma.exception.findMany({
    where: { shipment: { order: { tenantId: session.tenantId } } },
    include: { shipment: { include: { order: { include: { customer: true } } } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json(exceptions)
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const exception = await prisma.exception.create({ data: body })
  return NextResponse.json(exception, { status: 201 })
}
