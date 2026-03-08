'use client'

import { useState, useCallback } from 'react'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { formatDate } from '@/lib/utils'

interface ReportData {
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
    byType: Record<string, number>
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
  drivers: Array<{
    driverId: string
    driverName: string
    shipmentCount: number
    successCount: number
    failedCount: number
    successRate: number
  }>
  customers: Array<{
    customerId: string
    customerName: string
    shipmentCount: number
    completedCount: number
    pendingCount: number
    failedCount: number
  }>
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
const STATUS_COLORS = {
  DELIVERED: '#10b981',
  IN_TRANSIT: '#3b82f6',
  PENDING: '#f59e0b',
  FAILED: '#ef4444',
  CANCELLED: '#6b7280',
  PLANNED: '#8b5cf6',
  DISPATCHED: '#06b6d4',
}

function KpiCard({
  label,
  value,
  unit = '',
  color = 'blue',
  icon: Icon,
}: {
  label: string
  value: number | string
  unit?: string
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'cyan'
  icon?: React.ReactNode
}) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
  }

  return (
    <div className={`rounded-lg border p-4 ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-75">{label}</p>
          <p className="text-2xl font-bold mt-1">
            {value}
            {unit && <span className="text-sm ml-1">{unit}</span>}
          </p>
        </div>
        {Icon && <div className="text-2xl opacity-50">{Icon}</div>}
      </div>
    </div>
  )
}

function ChartSection({
  title,
  children,
  className = '',
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  )
}

function StatisticsTable({
  data,
  columns,
}: {
  data: any[]
  columns: Array<{
    key: string
    label: string
    format?: (value: any) => React.ReactNode
  }>
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-left font-semibold text-gray-700">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-gray-600">
                  {col.format ? col.format(row[col.key]) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DateRangeFilter({
  onStartDateChange,
  onEndDateChange,
  onApply,
  startDate,
  endDate,
}: {
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  onApply: () => void
  startDate: string
  endDate: string
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={onApply}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          Apply
        </button>
      </div>
    </div>
  )
}

function ExceptionSummary({ exceptions }: { exceptions: ReportData['exceptions'] }) {
  const exceptionData = Object.entries(exceptions.byType).map(([type, count]) => ({
    name: type,
    value: count,
  }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-700 font-medium">Total</p>
          <p className="text-2xl font-bold text-blue-900">{exceptions.total}</p>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
          <p className="text-xs text-yellow-700 font-medium">Open</p>
          <p className="text-2xl font-bold text-yellow-900">{exceptions.openCount}</p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <p className="text-xs text-green-700 font-medium">Resolved</p>
          <p className="text-2xl font-bold text-green-900">{exceptions.resolvedCount}</p>
        </div>
      </div>

      {exceptionData.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Exceptions by Type</h3>
          <div className="space-y-2">
            {exceptionData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{item.name}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 bg-gray-200 rounded-full w-32">
                    <div
                      className="h-full bg-red-500 rounded-full"
                      style={{
                        width: `${(item.value / exceptions.total) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-800 w-8 text-right">
                    {item.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function AnalyticsDashboard({ data }: { data: ReportData }) {
  const [startDate, setStartDate] = useState(data.period.startDate)
  const [endDate, setEndDate] = useState(data.period.endDate)
  const [isLoading, setIsLoading] = useState(false)

  const handleApplyDateRange = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('startDate', startDate)
      params.append('endDate', endDate)
      const response = await fetch(`/api/reports?${params.toString()}`)
      if (response.ok) {
        const newData = await response.json()
        window.location.reload()
      }
    } catch (error) {
      console.error('Error fetching updated data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [startDate, endDate])

  // Prepare data for charts
  const statusDistributionData = [
    { name: 'Delivered', value: data.summary.deliveredCount, color: STATUS_COLORS.DELIVERED },
    { name: 'In Transit', value: data.summary.inTransitCount, color: STATUS_COLORS.IN_TRANSIT },
    { name: 'Pending', value: data.summary.pendingCount, color: STATUS_COLORS.PENDING },
    { name: 'Dispatched', value: data.summary.dispatchedCount, color: STATUS_COLORS.DISPATCHED },
    { name: 'Planned', value: data.summary.plannedCount, color: STATUS_COLORS.PLANNED },
    { name: 'Failed', value: data.summary.failedCount, color: STATUS_COLORS.FAILED },
    { name: 'Cancelled', value: data.summary.cancelledCount, color: STATUS_COLORS.CANCELLED },
  ].filter((item) => item.value > 0)

  const topDrivers = data.drivers.slice(0, 5)
  const topCustomers = data.customers.slice(0, 5)

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Period: {startDate} to {endDate}
        </p>
      </div>

      {/* Date Range Filter */}
      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onApply={handleApplyDateRange}
      />

      {/* KPI Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Performance Indicators</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total Shipments"
            value={data.summary.totalShipments}
            color="blue"
            icon="📦"
          />
          <KpiCard
            label="On-Time Delivery"
            value={`${data.summary.onTimeDeliveryPercent}%`}
            color="green"
            icon="✓"
          />
          <KpiCard
            label="Avg Delivery Time"
            value={data.summary.avgDeliveryTimeHours.toFixed(1)}
            unit="hours"
            color="purple"
            icon="⏱"
          />
          <KpiCard
            label="Failed Shipments"
            value={data.summary.failedCount}
            color="red"
            icon="✗"
          />
        </div>
      </div>

      {/* Status Distribution and Exception Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <ChartSection title="Shipment Status Distribution">
          {statusDistributionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) =>
                    `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`${value} shipments`, 'Count']}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No shipment data available
            </div>
          )}
        </ChartSection>

        {/* Exception Summary */}
        <ChartSection title="Exception Summary">
          <ExceptionSummary exceptions={data.exceptions} />
        </ChartSection>
      </div>

      {/* Route Efficiency */}
      <ChartSection title="Route Efficiency Metrics">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-2">Total Routes</p>
            <p className="text-3xl font-bold text-gray-900">{data.routes.total}</p>
            <p className="text-xs text-gray-500 mt-1">
              {data.routes.activeCount} active, {data.routes.completedCount} completed
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Average Stops Per Route</p>
            <p className="text-3xl font-bold text-gray-900">
              {data.routes.avgStopsPerRoute.toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Average Distance</p>
            <p className="text-3xl font-bold text-gray-900">
              {data.routes.avgDistanceKm.toFixed(1)} km
            </p>
          </div>
          <div className="flex items-center justify-center">
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 font-medium">Route Efficiency</p>
              <p className="text-2xl font-bold text-blue-900 mt-2">
                {(data.routes.total > 0 ? (data.routes.completedCount / data.routes.total) * 100 : 0).toFixed(1)}%
              </p>
              <p className="text-xs text-blue-600 mt-1">Completion Rate</p>
            </div>
          </div>
        </div>
      </ChartSection>

      {/* Top Drivers */}
      {topDrivers.length > 0 && (
        <ChartSection title="Top Drivers by Performance">
          <StatisticsTable
            data={topDrivers}
            columns={[
              { key: 'driverName', label: 'Driver Name' },
              { key: 'shipmentCount', label: 'Shipments' },
              { key: 'successCount', label: 'Delivered' },
              { key: 'failedCount', label: 'Failed' },
              {
                key: 'successRate',
                label: 'Success Rate',
                format: (value: number) => `${value.toFixed(1)}%`,
              },
            ]}
          />
        </ChartSection>
      )}

      {/* Top Customers */}
      {topCustomers.length > 0 && (
        <ChartSection title="Top Customers by Order Activity">
          <StatisticsTable
            data={topCustomers}
            columns={[
              { key: 'customerName', label: 'Customer Name' },
              { key: 'shipmentCount', label: 'Total Shipments' },
              { key: 'completedCount', label: 'Completed' },
              { key: 'pendingCount', label: 'Pending' },
              { key: 'failedCount', label: 'Failed' },
            ]}
          />
        </ChartSection>
      )}

      {/* Summary Stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipment Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-700 font-medium">Delivered</p>
            <p className="text-2xl font-bold text-green-900">{data.summary.deliveredCount}</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700 font-medium">In Transit</p>
            <p className="text-2xl font-bold text-blue-900">{data.summary.inTransitCount}</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-700 font-medium">Pending</p>
            <p className="text-2xl font-bold text-yellow-900">{data.summary.pendingCount}</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-700 font-medium">Failed</p>
            <p className="text-2xl font-bold text-red-900">{data.summary.failedCount}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
