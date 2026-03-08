import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { ShipmentStatus, ExceptionType, ExceptionStatus } from '@prisma/client'

// Type definitions for the report response
interface ShipmentStatusCount {
  DELIVERED: number
  IN_TRANSIT: number
  PENDING: number
  FAILED: number
  CANCELLED: number
  PLANNED: number
  DISPATCHED: number
}

type ExceptionByType = Partial<Record<ExceptionType, number>>

interface DriverPerformance {
  driverId: string
  driverName: string
  shipmentCount: number
  successCount: number
  failedCount: number
  successRate: number
}

interface CustomerOrderSummary {
  customerId: string
  customerName: string
  shipmentCount: number
  completedCount: number
  pendingCount: number
  failedCount: number
}

interface ReportResponse {
  period: {
    startDate: string
    endDate: string
  }
  summary: {
    totalShipments: number
    deliveredCount: number
    inTransitCount: number
    pendingCount: number
    failedCount: number
    cancelledCount: number
    plannedCount: number
    dispatchedCount: number
    onTimeDeliveryPercent: number
    avgDeliveryTimeHours: number
  }
  exceptions: {
    total: number
    byType: ExceptionByType
    openCount: number
    inProgressCount: number
    resolvedCount: number
  }
  routes: {
    total: number
    activeCount: number
    completedCount: number
    avgStopsPerRoute: number
    avgDistanceKm: number
  }
  drivers: DriverPerformance[]
  customers: CustomerOrderSummary[]
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Verify authentication and authorization
    const session = await getSessionFromRequest(req)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse optional date range filters
    const { searchParams } = new URL(req.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    // Set default date range (last 30 days if not provided)
    const endDate = endDateParam ? new Date(endDateParam) : new Date()
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Ensure start date is before end date
    if (startDate > endDate) {
      return NextResponse.json(
        { error: 'startDate must be before endDate' },
        { status: 400 }
      )
    }

    // Build base where clause for tenant and date filtering
    const baseWhere = {
      order: {
        tenantId: session.tenantId,
      },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    }

    // Fetch all required data in parallel
    const [
      allShipments,
      deliveredShipments,
      inTransitShipments,
      pendingShipments,
      failedShipments,
      cancelledShipments,
      plannedShipments,
      dispatchedShipments,
      allRoutes,
      activeRoutes,
      completedRoutes,
      allExceptions,
      openExceptions,
      allStops,
      allDrivers,
      allCustomers,
    ] = await Promise.all([
      // Shipments by status
      prisma.shipment.findMany({ where: baseWhere }),
      prisma.shipment.findMany({
        where: { ...baseWhere, status: 'DELIVERED' },
        include: { pod: true },
      }),
      prisma.shipment.findMany({
        where: { ...baseWhere, status: 'IN_TRANSIT' },
      }),
      prisma.shipment.findMany({
        where: { ...baseWhere, status: 'PENDING' },
      }),
      prisma.shipment.findMany({
        where: { ...baseWhere, status: 'FAILED' },
      }),
      prisma.shipment.findMany({
        where: { ...baseWhere, status: 'CANCELLED' },
      }),
      prisma.shipment.findMany({
        where: { ...baseWhere, status: 'PLANNED' },
      }),
      prisma.shipment.findMany({
        where: { ...baseWhere, status: 'DISPATCHED' },
      }),
      // Routes
      prisma.route.findMany({
        where: { tenantId: session.tenantId },
        include: { stops: true, driver: true },
      }),
      prisma.route.findMany({
        where: { tenantId: session.tenantId, status: { in: ['DISPATCHED', 'IN_PROGRESS'] } },
      }),
      prisma.route.findMany({
        where: { tenantId: session.tenantId, status: 'COMPLETED' },
      }),
      // Exceptions
      prisma.exception.findMany({
        where: {
          shipment: {
            order: { tenantId: session.tenantId },
          },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      prisma.exception.findMany({
        where: {
          shipment: {
            order: { tenantId: session.tenantId },
          },
          status: 'OPEN',
        },
      }),
      // Stops for route metrics
      prisma.stop.findMany({
        where: {
          route: { tenantId: session.tenantId },
        },
      }),
      // Drivers
      prisma.driver.findMany({
        where: { tenantId: session.tenantId },
        include: {
          routes: {
            where: {
              shipments: {
                some: {
                  createdAt: {
                    gte: startDate,
                    lte: endDate,
                  },
                },
              },
            },
            include: { shipments: true },
          },
        },
      }),
      // Customers
      prisma.customer.findMany({
        where: { tenantId: session.tenantId },
        include: {
          orders: {
            where: {
              shipments: {
                some: {
                  createdAt: {
                    gte: startDate,
                    lte: endDate,
                  },
                },
              },
            },
            include: {
              shipments: true,
            },
          },
        },
      }),
    ])

    // Calculate on-time delivery percentage
    let onTimeDeliveryPercent = 0
    if (deliveredShipments.length > 0) {
      const onTimeCount = deliveredShipments.filter((shipment) => {
        if (!shipment.plannedDate || !shipment.pod) return false
        return shipment.pod.deliveryTime <= shipment.plannedDate
      }).length
      onTimeDeliveryPercent = (onTimeCount / deliveredShipments.length) * 100
    }

    // Calculate average delivery time in hours
    let avgDeliveryTimeHours = 0
    if (deliveredShipments.length > 0) {
      const totalDeliveryTime = deliveredShipments.reduce((sum, shipment) => {
        if (!shipment.pod) return sum
        const deliveryTime =
          shipment.pod.deliveryTime.getTime() - shipment.createdAt.getTime()
        return sum + deliveryTime
      }, 0)
      avgDeliveryTimeHours = totalDeliveryTime / deliveredShipments.length / (1000 * 60 * 60)
    }

    // Group exceptions by type
    const exceptionsByType: ExceptionByType = {}
    allExceptions.forEach((exception) => {
      const type = exception.type as ExceptionType
      exceptionsByType[type] = (exceptionsByType[type] || 0) + 1
    })

    // Calculate route metrics
    let avgStopsPerRoute = 0
    if (allRoutes.length > 0) {
      const totalStops = allStops.length
      avgStopsPerRoute = totalStops / allRoutes.length
    }

    let avgDistanceKm = 0
    const routesWithDistance = allRoutes.filter((route) => route.distanceKm)
    if (routesWithDistance.length > 0) {
      const totalDistance = routesWithDistance.reduce((sum, route) => sum + (route.distanceKm || 0), 0)
      avgDistanceKm = totalDistance / routesWithDistance.length
    }

    // Calculate driver performance
    const driverPerformance: DriverPerformance[] = allDrivers
      .map((driver) => {
        let shipmentCount = 0
        let successCount = 0
        let failedCount = 0

        driver.routes.forEach((route) => {
          route.shipments.forEach((shipment) => {
            shipmentCount++
            if (shipment.status === 'DELIVERED') {
              successCount++
            } else if (shipment.status === 'FAILED') {
              failedCount++
            }
          })
        })

        return {
          driverId: driver.id,
          driverName: driver.name,
          shipmentCount,
          successCount,
          failedCount,
          successRate: shipmentCount > 0 ? (successCount / shipmentCount) * 100 : 0,
        }
      })
      .filter((driver) => driver.shipmentCount > 0)
      .sort((a, b) => b.shipmentCount - a.shipmentCount)

    // Calculate customer order summary
    const customerOrderSummary: CustomerOrderSummary[] = allCustomers
      .map((customer) => {
        let shipmentCount = 0
        let completedCount = 0
        let pendingCount = 0
        let failedCount = 0

        customer.orders.forEach((order) => {
          order.shipments.forEach((shipment) => {
            shipmentCount++
            if (shipment.status === 'DELIVERED') {
              completedCount++
            } else if (['PENDING', 'PLANNED', 'DISPATCHED', 'IN_TRANSIT'].includes(shipment.status)) {
              pendingCount++
            } else if (shipment.status === 'FAILED') {
              failedCount++
            }
          })
        })

        return {
          customerId: customer.id,
          customerName: customer.name,
          shipmentCount,
          completedCount,
          pendingCount,
          failedCount,
        }
      })
      .filter((customer) => customer.shipmentCount > 0)
      .sort((a, b) => b.shipmentCount - a.shipmentCount)

    // Count exceptions by status
    const inProgressCount = allExceptions.filter((e) => e.status === 'IN_PROGRESS').length
    const resolvedCount = allExceptions.filter((e) => e.status === 'RESOLVED').length

    // Build the report response
    const report: ReportResponse = {
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      summary: {
        totalShipments: allShipments.length,
        deliveredCount: deliveredShipments.length,
        inTransitCount: inTransitShipments.length,
        pendingCount: pendingShipments.length,
        failedCount: failedShipments.length,
        cancelledCount: cancelledShipments.length,
        plannedCount: plannedShipments.length,
        dispatchedCount: dispatchedShipments.length,
        onTimeDeliveryPercent: Math.round(onTimeDeliveryPercent * 100) / 100,
        avgDeliveryTimeHours: Math.round(avgDeliveryTimeHours * 100) / 100,
      },
      exceptions: {
        total: allExceptions.length,
        byType: exceptionsByType,
        openCount: openExceptions.length,
        inProgressCount,
        resolvedCount,
      },
      routes: {
        total: allRoutes.length,
        activeCount: activeRoutes.length,
        completedCount: completedRoutes.length,
        avgStopsPerRoute: Math.round(avgStopsPerRoute * 100) / 100,
        avgDistanceKm: Math.round(avgDistanceKm * 100) / 100,
      },
      drivers: driverPerformance,
      customers: customerOrderSummary,
    }

    return NextResponse.json(report, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('Reports API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
