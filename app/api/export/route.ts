import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { formatDate } from '@/lib/utils'

// Type definitions
interface ExportParams {
  format: 'csv' | 'pdf'
  dataType: 'shipments' | 'routes' | 'drivers' | 'customers' | 'all'
  status?: string
  startDate?: string
  endDate?: string
}

interface ShipmentExportRow {
  Reference: string
  Customer: string
  Status: string
  Origin: string
  Destination: string
  'Planned Date': string
  Driver: string
  Vehicle: string
  Distance: string
}

interface RouteExportRow {
  Name: string
  Driver: string
  Vehicle: string
  Status: string
  'Planned Start': string
  'Distance (km)': string
  'Est. Duration (min)': string
}

interface DriverExportRow {
  Name: string
  Phone: string
  Email: string
  Status: string
  'Created At': string
}

interface CustomerExportRow {
  Name: string
  Email: string
  Phone: string
  Address: string
  'Created At': string
}

// CSV escaping utility
function escapeCSVField(field: string | null | undefined): string {
  if (field === null || field === undefined) return ''
  const str = String(field)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// Generate CSV content
function generateCSV(data: unknown[], headers: string[]): string {
  const lines: string[] = []

  // Add header
  lines.push(headers.map(escapeCSVField).join(','))

  // Add data rows
  if (Array.isArray(data)) {
    data.forEach((row) => {
      const values = headers.map(header => {
        const value = (row as Record<string, unknown>)[header]
        return escapeCSVField(value as string)
      })
      lines.push(values.join(','))
    })
  }

  return lines.join('\n')
}

// Generate simple PDF using plain text format
function generatePDF(title: string, headers: string[], data: unknown[]): string {
  const lines: string[] = []
  const now = new Date().toLocaleString('en-GB')

  // PDF Header
  lines.push('%PDF-1.4')
  lines.push('1 0 obj')
  lines.push('<< /Type /Catalog /Pages 2 0 R >>')
  lines.push('endobj')
  lines.push('2 0 obj')
  lines.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  lines.push('endobj')

  // Build content string
  const contentLines: string[] = []
  contentLines.push(`FleetFlow Export Report - ${title}`)
  contentLines.push(`Generated: ${now}`)
  contentLines.push('')
  contentLines.push(headers.join(' | '))
  contentLines.push('-'.repeat(Math.min(120, headers.join(' | ').length)))

  if (Array.isArray(data)) {
    data.forEach((row) => {
      const values = headers.map(header => {
        const value = (row as Record<string, unknown>)[header]
        return String(value ?? '').substring(0, 20)
      })
      contentLines.push(values.join(' | '))
    })
  }

  const content = contentLines.join('\n')
  const contentStr = content
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')

  lines.push('3 0 obj')
  lines.push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>`
  )
  lines.push('endobj')
  lines.push('4 0 obj')
  lines.push(`<< /Length ${contentStr.length + 100} >>`)
  lines.push('stream')
  lines.push('BT')
  lines.push('/F1 12 Tf')
  lines.push('50 700 Td')
  lines.push(`(${contentStr}) Tj`)
  lines.push('ET')
  lines.push('endstream')
  lines.push('endobj')
  lines.push('xref')
  lines.push('0 5')
  lines.push('0000000000 65535 f ')
  lines.push('0000000009 00000 n ')
  lines.push('0000000058 00000 n ')
  lines.push('0000000115 00000 n ')
  lines.push('0000000280 00000 n ')
  lines.push('trailer')
  lines.push('<< /Size 5 /Root 1 0 R >>')
  lines.push('startxref')
  lines.push('0')
  lines.push('%%EOF')

  return lines.join('\n')
}

// Fetch shipment data
async function fetchShipments(
  tenantId: string,
  status?: string,
  startDate?: string,
  endDate?: string
): Promise<ShipmentExportRow[]> {
  const where: Record<string, unknown> = {
    order: { tenantId },
  }

  if (status) where.status = status

  if (startDate || endDate) {
    where.plannedDate = {}
    if (startDate) (where.plannedDate as Record<string, unknown>).gte = new Date(startDate)
    if (endDate) (where.plannedDate as Record<string, unknown>).lte = new Date(endDate)
  }

  const shipments = await prisma.shipment.findMany({
    where,
    include: {
      order: { include: { customer: true } },
      route: { include: { driver: true, vehicle: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10000, // Limit to prevent memory issues
  })

  return shipments.map(shipment => ({
    Reference: shipment.order?.customer?.name || 'Unknown',
    Customer: shipment.order?.customer?.name || 'N/A',
    Status: shipment.status,
    Origin: shipment.origin,
    Destination: shipment.destination,
    'Planned Date': formatDate(shipment.plannedDate),
    Driver: shipment.route?.driver?.name || 'Unassigned',
    Vehicle: shipment.route?.vehicle?.registration || 'Unassigned',
    Distance: shipment.route?.distanceKm ? `${shipment.route.distanceKm.toFixed(2)} km` : 'N/A',
  }))
}

// Fetch route data
async function fetchRoutes(tenantId: string): Promise<RouteExportRow[]> {
  const routes = await prisma.route.findMany({
    where: { tenantId },
    include: { driver: true, vehicle: true },
    orderBy: { createdAt: 'desc' },
    take: 10000,
  })

  return routes.map(route => ({
    Name: route.name || 'Unnamed Route',
    Driver: route.driver?.name || 'Unassigned',
    Vehicle: route.vehicle?.registration || 'Unassigned',
    Status: route.status,
    'Planned Start': formatDate(route.plannedStart),
    'Distance (km)': route.distanceKm ? route.distanceKm.toFixed(2) : 'N/A',
    'Est. Duration (min)': route.estimatedDuration ? String(route.estimatedDuration) : 'N/A',
  }))
}

// Fetch driver data
async function fetchDrivers(tenantId: string): Promise<DriverExportRow[]> {
  const drivers = await prisma.driver.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 10000,
  })

  return drivers.map(driver => ({
    Name: driver.name,
    Phone: driver.phone || 'N/A',
    Email: driver.email || 'N/A',
    Status: driver.status,
    'Created At': formatDate(driver.createdAt),
  }))
}

// Fetch customer data
async function fetchCustomers(tenantId: string): Promise<CustomerExportRow[]> {
  const customers = await prisma.customer.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 10000,
  })

  return customers.map(customer => ({
    Name: customer.name,
    Email: customer.contactEmail || 'N/A',
    Phone: customer.contactPhone || 'N/A',
    Address: customer.address || 'N/A',
    'Created At': formatDate(customer.createdAt),
  }))
}

// Validate query parameters
function validateParams(searchParams: URLSearchParams): { valid: boolean; error?: string; params?: ExportParams } {
  const format = (searchParams.get('format') || 'csv').toLowerCase() as 'csv' | 'pdf'
  const dataType = (searchParams.get('dataType') || 'shipments').toLowerCase() as ExportParams['dataType']

  if (!['csv', 'pdf'].includes(format)) {
    return { valid: false, error: 'Invalid format. Must be "csv" or "pdf"' }
  }

  if (!['shipments', 'routes', 'drivers', 'customers', 'all'].includes(dataType)) {
    return { valid: false, error: 'Invalid dataType. Must be "shipments", "routes", "drivers", "customers", or "all"' }
  }

  const status = searchParams.get('status') || undefined
  const startDate = searchParams.get('startDate') || undefined
  const endDate = searchParams.get('endDate') || undefined

  // Validate dates if provided
  if (startDate && isNaN(Date.parse(startDate))) {
    return { valid: false, error: 'Invalid startDate format' }
  }
  if (endDate && isNaN(Date.parse(endDate))) {
    return { valid: false, error: 'Invalid endDate format' }
  }

  return {
    valid: true,
    params: {
      format,
      dataType,
      status,
      startDate,
      endDate,
    },
  }
}

// Generate filename with timestamp
function generateFilename(dataType: string, format: 'csv' | 'pdf', timestamp: string): string {
  const ext = format === 'csv' ? 'csv' : 'pdf'
  return `${dataType}-${timestamp}.${ext}`
}

export async function GET(req: NextRequest) {
  try {
    // Authentication check
    const session = await getSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate parameters
    const { searchParams } = new URL(req.url)
    const validation = validateParams(searchParams)

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const params = validation.params!
    const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD format

    let data: unknown[] = []
    let headers: string[] = []
    let dataTypeName = ''

    // Fetch data based on dataType
    if (params.dataType === 'shipments' || params.dataType === 'all') {
      const shipments = await fetchShipments(session.tenantId, params.status, params.startDate, params.endDate)
      data = shipments
      headers = ['Reference', 'Customer', 'Status', 'Origin', 'Destination', 'Planned Date', 'Driver', 'Vehicle', 'Distance']
      dataTypeName = 'shipments'

      if (params.dataType !== 'all') {
        // Return single dataset
        const content = params.format === 'csv'
          ? generateCSV(data, headers)
          : generatePDF('Shipments', headers, data)

        const filename = generateFilename(dataTypeName, params.format, timestamp)
        const contentType = params.format === 'csv' ? 'text/csv; charset=utf-8' : 'application/pdf'

        return new NextResponse(typeof content === 'string' ? Buffer.from(content, 'utf-8') : content, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        })
      }
    }

    if (params.dataType === 'routes' || params.dataType === 'all') {
      const routes = await fetchRoutes(session.tenantId)
      if (params.dataType === 'all') {
        // For 'all', we'll create a multi-section export
        // For CSV, concatenate all with section headers
        // For PDF, create multiple sections
      } else {
        data = routes
        headers = ['Name', 'Driver', 'Vehicle', 'Status', 'Planned Start', 'Distance (km)', 'Est. Duration (min)']
        dataTypeName = 'routes'

        const content = params.format === 'csv'
          ? generateCSV(data, headers)
          : generatePDF('Routes', headers, data)

        const filename = generateFilename(dataTypeName, params.format, timestamp)
        const contentType = params.format === 'csv' ? 'text/csv; charset=utf-8' : 'application/pdf'

        return new NextResponse(content, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        })
      }
    }

    if (params.dataType === 'drivers' || params.dataType === 'all') {
      const drivers = await fetchDrivers(session.tenantId)
      if (params.dataType === 'all') {
        // For 'all', accumulate data
      } else {
        data = drivers
        headers = ['Name', 'Phone', 'Email', 'Status', 'Created At']
        dataTypeName = 'drivers'

        const content = params.format === 'csv'
          ? generateCSV(data, headers)
          : generatePDF('Drivers', headers, data)

        const filename = generateFilename(dataTypeName, params.format, timestamp)
        const contentType = params.format === 'csv' ? 'text/csv; charset=utf-8' : 'application/pdf'

        return new NextResponse(content, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        })
      }
    }

    if (params.dataType === 'customers' || params.dataType === 'all') {
      const customers = await fetchCustomers(session.tenantId)
      if (params.dataType === 'all') {
        // For 'all', accumulate data
      } else {
        data = customers
        headers = ['Name', 'Email', 'Phone', 'Address', 'Created At']
        dataTypeName = 'customers'

        const content = params.format === 'csv'
          ? generateCSV(data, headers)
          : generatePDF('Customers', headers, data)

        const filename = generateFilename(dataTypeName, params.format, timestamp)
        const contentType = params.format === 'csv' ? 'text/csv; charset=utf-8' : 'application/pdf'

        return new NextResponse(content, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        })
      }
    }

    // Handle 'all' dataType
    if (params.dataType === 'all') {
      const shipments = await fetchShipments(session.tenantId, params.status, params.startDate, params.endDate)
      const routes = await fetchRoutes(session.tenantId)
      const drivers = await fetchDrivers(session.tenantId)
      const customers = await fetchCustomers(session.tenantId)

      if (params.format === 'csv') {
        // Create CSV with multiple sections
        const sections: string[] = []

        sections.push('# SHIPMENTS')
        const shipmentsHeaders = ['Reference', 'Customer', 'Status', 'Origin', 'Destination', 'Planned Date', 'Driver', 'Vehicle', 'Distance']
        sections.push(generateCSV(shipments, shipmentsHeaders))
        sections.push('')
        sections.push('')

        sections.push('# ROUTES')
        const routesHeaders = ['Name', 'Driver', 'Vehicle', 'Status', 'Planned Start', 'Distance (km)', 'Est. Duration (min)']
        sections.push(generateCSV(routes, routesHeaders))
        sections.push('')
        sections.push('')

        sections.push('# DRIVERS')
        const driversHeaders = ['Name', 'Phone', 'Email', 'Status', 'Created At']
        sections.push(generateCSV(drivers, driversHeaders))
        sections.push('')
        sections.push('')

        sections.push('# CUSTOMERS')
        const customersHeaders = ['Name', 'Email', 'Phone', 'Address', 'Created At']
        sections.push(generateCSV(customers, customersHeaders))

        const filename = generateFilename('fleetflow-export', 'csv', timestamp)

        return new NextResponse(sections.join('\n'), {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        })
      } else {
        // PDF with multiple sections - for now, just export shipments as representative
        const shipmentsHeaders = ['Reference', 'Customer', 'Status', 'Origin', 'Destination', 'Planned Date', 'Driver', 'Vehicle', 'Distance']
        const content = generatePDF('FleetFlow Complete Export', shipmentsHeaders, shipments)
        const filename = generateFilename('fleetflow-export', 'pdf', timestamp)

        return new NextResponse(Buffer.from(content, 'utf-8'), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        })
      }
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
