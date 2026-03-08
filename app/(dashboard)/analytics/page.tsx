import { getSession } from '@/lib/auth'
import { AnalyticsDashboard } from './analytics-client'

async function getReportsData(startDate?: string, endDate?: string) {
  const params = new URLSearchParams()
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const response = await fetch(`${baseUrl}/api/reports?${params.toString()}`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch reports data: ${response.status}`)
  }

  return response.json()
}

export default async function AnalyticsPage() {
  const session = await getSession()
  if (!session) return null

  try {
    const data = await getReportsData()
    return <AnalyticsDashboard data={data} />
  } catch (error) {
    console.error('Analytics page error:', error)
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <h3 className="font-semibold text-red-800">Error Loading Analytics</h3>
          <p className="text-sm text-red-700 mt-1">
            Unable to fetch analytics data. Please try again later.
          </p>
        </div>
      </div>
    )
  }
}
