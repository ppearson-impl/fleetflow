/**
 * Export Endpoint Usage Examples
 *
 * This file demonstrates various ways to use the /api/export endpoint
 * for exporting FleetFlow data in different formats.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Frontend/Client Examples
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Example 1: Export shipments as CSV
 * Triggers a download of all shipments in CSV format
 */
export async function exportShipmentsAsCSV() {
  try {
    const response = await fetch('/api/export?format=csv&dataType=shipments')

    if (!response.ok) {
      const error = await response.json()
      console.error('Export failed:', error)
      return
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shipments-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (error) {
    console.error('Export error:', error)
  }
}

/**
 * Example 2: Export delivered shipments only
 * Filters by shipment status before exporting
 */
export async function exportDeliveredShipments() {
  const params = new URLSearchParams({
    format: 'csv',
    dataType: 'shipments',
    status: 'DELIVERED',
  })

  const response = await fetch(`/api/export?${params}`)
  const blob = await response.blob()

  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'delivered-shipments.csv'
  a.click()
  window.URL.revokeObjectURL(url)
}

/**
 * Example 3: Export shipments within a date range
 * Filters shipments by planned delivery date
 */
export async function exportShipmentsByDateRange(startDate: string, endDate: string) {
  const params = new URLSearchParams({
    format: 'csv',
    dataType: 'shipments',
    startDate, // Format: YYYY-MM-DD
    endDate,   // Format: YYYY-MM-DD
  })

  const response = await fetch(`/api/export?${params}`)
  const blob = await response.blob()

  // Trigger download
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `shipments-${startDate}-to-${endDate}.csv`
  link.click()
}

/**
 * Example 4: Export routes as CSV
 */
export async function exportRoutesAsCSV() {
  const response = await fetch('/api/export?format=csv&dataType=routes')
  const blob = await response.blob()

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `routes-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Example 5: Export drivers as PDF
 */
export async function exportDriversAsPDF() {
  const response = await fetch('/api/export?format=pdf&dataType=drivers')
  const blob = await response.blob()

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `drivers-${new Date().toISOString().split('T')[0]}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Example 6: Export all data
 * Returns CSV with multiple sections (shipments, routes, drivers, customers)
 */
export async function exportAllData() {
  const response = await fetch('/api/export?format=csv&dataType=all')
  const blob = await response.blob()

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fleetflow-export-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────────────────────────────────────────
// Server/Backend Examples
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Example 7: Server-side export for email delivery
 * Fetches data and processes it on the server
 */
export async function serverSideExportForEmail(
  baseUrl: string,
  sessionCookie: string
) {
  try {
    const response = await fetch(`${baseUrl}/api/export?format=csv&dataType=shipments`, {
      headers: {
        'Cookie': `fleetflow_session=${sessionCookie}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`)
    }

    const csvContent = await response.text()

    // Now you could email this or process it further
    console.log('CSV Export received, rows:', csvContent.split('\n').length)

    return csvContent
  } catch (error) {
    console.error('Server-side export error:', error)
    throw error
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// React Hook Examples
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Example 8: React hook for exporting data
 * useCallback pattern for use in React components
 */
export function useExportData() {
  const handleExport = async (
    format: 'csv' | 'pdf',
    dataType: 'shipments' | 'routes' | 'drivers' | 'customers' | 'all',
    filters?: {
      status?: string
      startDate?: string
      endDate?: string
    }
  ) => {
    try {
      const params = new URLSearchParams({
        format,
        dataType,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.startDate && { startDate: filters.startDate }),
        ...(filters?.endDate && { endDate: filters.endDate }),
      })

      const response = await fetch(`/api/export?${params}`)

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const filename = response.headers
        .get('content-disposition')
        ?.split('filename="')[1]
        ?.split('"')[0] || `export-${Date.now()}.${format}`

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)

      return { success: true, filename }
    } catch (error) {
      console.error('Export error:', error)
      return { success: false, error }
    }
  }

  return { handleExport }
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Handling Examples
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Example 9: Robust error handling for exports
 */
export async function robustExportWithErrorHandling(
  format: 'csv' | 'pdf',
  dataType: string
) {
  try {
    const response = await fetch(`/api/export?format=${format}&dataType=${dataType}`)

    switch (response.status) {
      case 401:
        console.error('Authentication failed - user is not logged in')
        // Redirect to login
        window.location.href = '/login'
        return

      case 400:
        const errorData = await response.json()
        console.error('Invalid request parameters:', errorData.error)
        alert(`Export error: ${errorData.error}`)
        return

      case 500:
        console.error('Server error occurred during export')
        alert('Server error occurred. Please try again later.')
        return

      case 200:
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `export-${Date.now()}.${format}`
        a.click()
        URL.revokeObjectURL(url)
        break

      default:
        console.error(`Unexpected response status: ${response.status}`)
    }
  } catch (error) {
    if (error instanceof TypeError) {
      console.error('Network error - check your connection')
    } else {
      console.error('Unexpected error:', error)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Advanced Examples
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Example 10: Batch exports with progress tracking
 * Export multiple data types sequentially
 */
export async function batchExportWithProgress(onProgress?: (status: string) => void) {
  const dataTypes = ['shipments', 'routes', 'drivers', 'customers'] as const
  const exports = []

  for (const dataType of dataTypes) {
    onProgress?.(`Exporting ${dataType}...`)

    try {
      const response = await fetch(`/api/export?format=csv&dataType=${dataType}`)

      if (response.ok) {
        const blob = await response.blob()
        const filename = `${dataType}-${new Date().toISOString().split('T')[0]}.csv`
        exports.push({ dataType, blob, filename })
      }
    } catch (error) {
      console.error(`Failed to export ${dataType}:`, error)
    }
  }

  onProgress?.('Export complete!')
  return exports
}

/**
 * Example 11: Export with custom processing
 * Fetch CSV and process it before display
 */
export async function exportAndProcess() {
  const response = await fetch('/api/export?format=csv&dataType=shipments')
  const csvText = await response.text()

  // Parse CSV manually or with a library
  const lines = csvText.split('\n')
  const headers = lines[0].split(',')

  const data = lines.slice(1).map(line => {
    const values = line.split(',')
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    return row
  })

  // Now you can process the data
  const deliveredCount = data.filter(row => row.Status === 'DELIVERED').length
  const pendingCount = data.filter(row => row.Status === 'PENDING').length

  console.log(`Delivered: ${deliveredCount}, Pending: ${pendingCount}`)

  return { headers, data, summary: { deliveredCount, pendingCount } }
}
