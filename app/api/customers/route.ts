import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const customers = await prisma.customer.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(customers)
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const customer = await prisma.customer.create({
    data: { ...body, tenantId: session.tenantId },
  })
  return NextResponse.json(customer, { status: 201 })
}
