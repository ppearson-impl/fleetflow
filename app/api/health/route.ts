import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const shipments = await prisma.shipment.count()
    const routes = await prisma.route.count()
    const customers = await prisma.customer.count()
    const drivers = await prisma.driver.count()
    const users = await prisma.user.count()
    const tenants = await prisma.tenant.count()

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      data: {
        shipments,
        routes,
        customers,
        drivers,
        users,
        tenants,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
