import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const exception = await prisma.exception.findUnique({
    where: { id: params.id },
    include: { shipment: { include: { order: true } } },
  })

  if (!exception) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Verify tenant access
  if (exception.shipment.order.tenantId !== session.tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(exception)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { status } = body

  // Get current exception to verify tenant access
  const current = await prisma.exception.findUnique({
    where: { id: params.id },
    include: { shipment: { include: { order: true } } },
  })

  if (!current) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (current.shipment.order.tenantId !== session.tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Validate status transition
  const validStatuses = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED']
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json(
      { error: 'Invalid status' },
      { status: 400 }
    )
  }

  // Update exception
  const updateData: any = { status: status || current.status }

  // Set resolvedAt when marking as resolved
  if (status === 'RESOLVED' && current.status !== 'RESOLVED') {
    updateData.resolvedAt = new Date()
  }

  const updated = await prisma.exception.update({
    where: { id: params.id },
    data: updateData,
    include: { shipment: { include: { order: true } } },
  })

  return NextResponse.json(updated)
}
