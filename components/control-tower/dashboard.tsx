'use client'

import { formatDateTime, statusColor } from '@/lib/utils'

interface KPIs {
  totalShipments: number
  deliveredToday: number
  lateShipments: number
  activeRoutes: number
  openExceptions: number
  onTimeRate: number
  activeDrivers: number
}

interface DashboardData {
  kpis: KPIs
  recentExceptions: Array<{
    id: string
    type: string
    description: string
    status: string
    createdAt: Date
    shipment: {
      id: string
      origin: string
      destination: string
      order: { reference: string }
    }
  }>
  shipmentsByDay: Array<{ date: Date; count: number }>
}

function KpiCard({ label, value, sub, color = 'blue' }: {
  label: string
  value: string | number
  sub?: string
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple'
}) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  }
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <div className="text-sm font-medium opacity-70 mb-1">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
      {sub && <div className="text-xs mt-1 opacity-60">{sub}</div>}
    </div>
  )
}

export function ControlTowerDashboard({ data }: { data: DashboardData }) {
  const { kpis, recentExceptions } = data

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Control Tower</h1>
        <p className="text-gray-500 text-sm mt-1">Live operational overview</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="On-Time Rate" value={`${kpis.onTimeRate}%`} sub="Today" color="green" />
        <KpiCard label="Delivered Today" value={kpis.deliveredToday} sub="shipments" color="blue" />
        <KpiCard label="Late Shipments" value={kpis.lateShipments} sub="need attention" color={kpis.lateShipments > 0 ? 'red' : 'green'} />
        <KpiCard label="Active Routes" value={kpis.activeRoutes} sub="in progress" color="purple" />
        <KpiCard label="Open Exceptions" value={kpis.openExceptions} sub="unresolved" color={kpis.openExceptions > 0 ? 'yellow' : 'green'} />
        <KpiCard label="Active Drivers" value={kpis.activeDrivers} sub="on duty" color="blue" />
        <KpiCard label="Total Shipments" value={kpis.totalShipments} sub="all time" color="blue" />
      </div>

      {/* Exceptions Feed */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Open Exceptions</h2>
        </div>
        {recentExceptions.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No open exceptions</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentExceptions.map((ex) => (
              <div key={ex.id} className="p-4 flex items-start gap-4">
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium mt-0.5 ${statusColor(ex.status)}`}>
                  {ex.type.replace(/_/g, ' ')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {ex.shipment.order.reference} — {ex.shipment.origin} → {ex.shipment.destination}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{ex.description}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{formatDateTime(ex.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
