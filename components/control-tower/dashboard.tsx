'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDateTime, statusColor } from '@/lib/utils'
import { ExceptionCard } from './exception-card'

interface KPIs {
  totalShipments: number
  deliveredToday: number
  lateShipments: number
  activeRoutes: number
  openExceptions: number
  onTimeRate: number
  activeDrivers: number
}

interface DrillDownData {
  lateShipments: Array<{
    id: string
    status: string
    origin: string
    destination: string
    plannedDate: Date | null
    order: { reference: string; customer: { name: string } }
    route: { driver?: { name: string } | null } | null
  }>
  activeRoutes: Array<{
    id: string
    name?: string | null
    status: string
    distanceKm?: number | null
    driver?: { name: string } | null
    vehicle?: { registration: string } | null
    stops: Array<{ id: string; status: string }>
  }>
}

interface DashboardData {
  kpis: KPIs
  drillDownData?: DrillDownData
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

function KpiCard({
  label,
  value,
  sub,
  color = 'blue',
  onClick,
}: {
  label: string
  value: string | number
  sub?: string
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple'
  onClick?: () => void
}) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  }
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border p-5 ${colors[color]} ${onClick ? 'cursor-pointer hover:shadow-md transition' : ''}`}
    >
      <div className="text-sm font-medium opacity-70 mb-1">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
      {sub && <div className="text-xs mt-1 opacity-60">{sub}</div>}
    </div>
  )
}

export function ControlTowerDashboard({ data }: { data: DashboardData }) {
  const { kpis, recentExceptions, drillDownData } = data
  const [selectedDrilldown, setSelectedDrilldown] = useState<'lateShipments' | 'activeRoutes' | null>(null)

  if (selectedDrilldown === 'lateShipments' && drillDownData?.lateShipments) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedDrilldown(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Late Shipments</h1>
            <p className="text-gray-500 text-sm mt-1">{drillDownData.lateShipments.length} shipments requiring attention</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr className="text-left text-sm font-semibold text-gray-700">
                  <th className="p-4">Order Ref</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Origin → Destination</th>
                  <th className="p-4">Planned Date</th>
                  <th className="p-4">Driver</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {drillDownData.lateShipments.map((ship) => (
                  <tr key={ship.id} className="hover:bg-gray-50">
                    <td className="p-4 text-sm font-mono text-blue-600">
                      <Link href={`/shipments/${ship.id}`} className="hover:underline">
                        {ship.order.reference}
                      </Link>
                    </td>
                    <td className="p-4 text-sm text-gray-700">{ship.order.customer.name}</td>
                    <td className="p-4 text-sm text-gray-600">{ship.origin} → {ship.destination}</td>
                    <td className="p-4 text-sm text-gray-600">{ship.plannedDate ? new Date(ship.plannedDate).toLocaleDateString() : '—'}</td>
                    <td className="p-4 text-sm text-gray-600">{ship.route?.driver?.name || '—'}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${statusColor(ship.status)}`}>
                        {ship.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  if (selectedDrilldown === 'activeRoutes' && drillDownData?.activeRoutes) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedDrilldown(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Active Routes</h1>
            <p className="text-gray-500 text-sm mt-1">{drillDownData.activeRoutes.length} routes in progress</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {drillDownData.activeRoutes.map((route) => (
            <div key={route.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{route.name || 'Unnamed Route'}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {route.driver?.name || 'Unassigned'} • {route.vehicle?.registration || 'No vehicle'}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded font-medium ${statusColor(route.status)}`}>
                  {route.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-gray-200">
                <div>
                  <div className="text-xs text-gray-600 mb-1">Distance</div>
                  <div className="text-lg font-bold text-gray-900">{route.distanceKm?.toFixed(1) || '—'} km</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Stops</div>
                  <div className="text-lg font-bold text-gray-900">{route.stops.length}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-700 mb-2">Stop Status</div>
                {route.stops.map((stop, idx) => (
                  <div key={stop.id} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Stop {idx + 1}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${statusColor(stop.status)}`}>
                      {stop.status}
                    </span>
                  </div>
                ))}
              </div>

              <Link
                href={`/dispatch`}
                className="block w-full text-center mt-4 pt-4 border-t border-gray-200 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View in Dispatch
              </Link>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Default overview
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Control Tower</h1>
        <p className="text-gray-500 text-sm mt-1">Live operational overview • Click KPI cards to drill down</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="On-Time Rate" value={`${kpis.onTimeRate}%`} sub="Today" color="green" />
        <KpiCard
          label="Delivered Today"
          value={kpis.deliveredToday}
          sub="shipments"
          color="blue"
        />
        <KpiCard
          label="Late Shipments"
          value={kpis.lateShipments}
          sub="need attention"
          color={kpis.lateShipments > 0 ? 'red' : 'green'}
          onClick={() => kpis.lateShipments > 0 && setSelectedDrilldown('lateShipments')}
        />
        <KpiCard
          label="Active Routes"
          value={kpis.activeRoutes}
          sub="in progress"
          color="purple"
          onClick={() => kpis.activeRoutes > 0 && setSelectedDrilldown('activeRoutes')}
        />
        <KpiCard
          label="Open Exceptions"
          value={kpis.openExceptions}
          sub="unresolved"
          color={kpis.openExceptions > 0 ? 'yellow' : 'green'}
        />
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
            <svg
              className="w-12 h-12 mx-auto mb-3 opacity-30"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p>No open exceptions</p>
          </div>
        ) : (
          <div className="space-y-2 p-3">
            {recentExceptions.map((ex) => (
              <ExceptionCard
                key={ex.id}
                id={ex.id}
                type={ex.type}
                description={ex.description}
                status={ex.status}
                createdAt={ex.createdAt}
                shipmentRef={ex.shipment.order.reference}
                shipmentRoute={`${ex.shipment.origin} → ${ex.shipment.destination}`}
                onStatusChange={() => {
                  // Refresh exceptions list (could trigger a refetch here)
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
