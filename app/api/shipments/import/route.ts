import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['ADMIN', 'PLANNER'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { rows } = body as { rows: Array<Record<string, string>> }

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }

  const results = { created: 0, errors: [] as string[] }

  for (const row of rows) {
    try {
      const reference = row['reference'] || row['Reference'] || `IMP-${Date.now()}-${Math.random()}`
      const customerName = row['customer'] || row['Customer'] || 'Unknown Customer'
      const origin = row['origin'] || row['Origin'] || ''
      const destination = row['destination'] || row['Destination'] || ''
      const plannedDateStr = row['planned_date'] || row['Planned Date'] || ''

      // Find or create customer
      let customer = await prisma.customer.findFirst({
        where: { tenantId: session.tenantId, name: customerName },
      })
      if (!customer) {
        customer = await prisma.customer.create({
          data: { tenantId: session.tenantId, name: customerName },
        })
      }

      // Find or create order
      let order = await prisma.order.findFirst({
        where: { tenantId: session.tenantId, reference },
      })
      if (!order) {
        order = await prisma.order.create({
          data: {
            tenantId: session.tenantId,
            customerId: customer.id,
            reference,
            status: 'CONFIRMED',
          },
        })
      }

      await prisma.shipment.create({
        data: {
          orderId: order.id,
          origin,
          destination,
          status: 'PENDING',
          plannedDate: plannedDateStr ? new Date(plannedDateStr) : null,
        },
      })

      results.created++
    } catch (e) {
      results.errors.push(`Row error: ${(e as Error).message}`)
    }
  }

  return NextResponse.json(results)
}
