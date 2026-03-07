'use client'

import { useState } from 'react'
import { formatDateTime, statusColor } from '@/lib/utils'

interface Route {
  id: string
  name: string | null
  status: string
  plannedStart: Date | null
  distanceKm: number | null
  estimatedDuration: number | null
  driver: { id: string; name: string; phone?: string | null } | null
  vehicle: { id: string; registration: string } | null
  stops: Array<{
    id: string
    sequence: number
    location: string
    status: string
    shipment: { id: string; order: { reference: string; customer: { name: string } } }
  }>
}

export function DispatchClient({
  data,
}: {
  data: { routes: Route[]; drivers: Array<{ id: string; name: string }>; vehicles: Array<{ id: string; registration: string }> }
}) {
  const [routes, setRoutes] = useState(data.routes)
  const [dispatching, setDispatching] = useState<string | null>(null)

  async function dispatch(routeId: string) {
    setDispatching(routeId)
    const res = await fetch(`/api/routes/${routeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DISPATCHED' }),
    })
    if (res.ok) {
      setRoutes((prev) => prev.map((r) => r.id === routeId ? { ...r, status: 'DISPATCHED' } : r))
    }
    setDispatching(null)
  }

  async function updateRoute(routeId: string, patch: Record<string, string>) {
    await fetch(`/api/routes/${routeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    setRoutes((prev) =>
      prev.map((r) => {
        if (r.id !== routeId) return r
        const driver = patch.driverId ? data.drivers.find((d) => d.id === patch.driverId) || null : r.driver
        const vehicle = patch.vehicleId ? data.vehicles.find((v) => v.id === patch.vehicleId) || null : r.vehicle
        return { ...r, driver, vehicle }
      })
    )
  }

  const grouped = {
    ready: routes.filter((r) => ['DRAFT', 'PLANNED'].includes(r.status)),
    active: routes.filter((r) => ['DISPATCHED', 'IN_PROGRESS'].includes(r.status)),
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dispatch</h1>
        <p className="text-gray-500 text-sm">Assign resources and dispatch routes to drivers</p>
      </div>

      {/* Ready to dispatch */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Ready to Dispatch ({grouped.ready.length})</h2>
        <div className="space-y-3">
          {grouped.ready.map((route) => (
            <RouteCard
              key={route.id}
              route={route}
              drivers={data.drivers}
              vehicles={data.vehicles}
              onDispatch={() => dispatch(route.id)}
              onUpdate={(patch) => updateRoute(route.id, patch)}
              dispatching={dispatching === route.id}
            />
          ))}
          {grouped.ready.length === 0 && (
            <div className="text-gray-400 text-sm py-4">No routes ready — create routes in the planning board first.</div>
          )}
        </div>
      </section>

      {/* Active routes */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Active Routes ({grouped.active.length})</h2>
        <div className="space-y-3">
          {grouped.active.map((route) => (
            <RouteCard key={route.id} route={route} drivers={data.drivers} vehicles={data.vehicles} readOnly />
          ))}
          {grouped.active.length === 0 && (
            <div className="text-gray-400 text-sm py-4">No active routes.</div>
          )}
        </div>
      </section>
    </div>
  )
}

function RouteCard({
  route,
  drivers,
  vehicles,
  onDispatch,
  onUpdate,
  dispatching,
  readOnly,
}: {
  route: Route
  drivers: Array<{ id: string; name: string }>
  vehicles: Array<{ id: string; registration: string }>
  onDispatch?: () => void
  onUpdate?: (patch: Record<string, string>) => void
  dispatching?: boolean
  readOnly?: boolean
}) {
  const completedStops = route.stops.filter((s) => s.status === 'DELIVERED').length

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{route.name || 'Unnamed Route'}</h3>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColor(route.status)}`}>
              {route.status}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5 space-x-3">
            <span>{route.stops.length} stops</span>
            {route.distanceKm && <span>{route.distanceKm} km</span>}
            {route.estimatedDuration && <span>~{route.estimatedDuration} min</span>}
            {route.plannedStart && <span>Start: {formatDateTime(route.plannedStart)}</span>}
          </div>
        </div>
        {!readOnly && onDispatch && (
          <button
            onClick={onDispatch}
            disabled={dispatching || !route.driver || !route.vehicle}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
            title={!route.driver || !route.vehicle ? 'Assign driver and vehicle first' : 'Dispatch route'}
          >
            {dispatching ? 'Dispatching...' : 'Dispatch'}
          </button>
        )}
        {readOnly && (
          <div className="text-sm text-gray-500">
            {completedStops}/{route.stops.length} delivered
          </div>
        )}
      </div>

      {/* Driver & Vehicle */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Driver</label>
          {readOnly ? (
            <div className="text-sm text-gray-900">{route.driver?.name || '—'}</div>
          ) : (
            <select
              value={route.driver?.id || ''}
              onChange={(e) => onUpdate?.({ driverId: e.target.value })}
              className="w-full text-sm px-2 py-1.5 border border-gray-300 rounded-lg"
            >
              <option value="">— Select driver —</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle</label>
          {readOnly ? (
            <div className="text-sm text-gray-900">{route.vehicle?.registration || '—'}</div>
          ) : (
            <select
              value={route.vehicle?.id || ''}
              onChange={(e) => onUpdate?.({ vehicleId: e.target.value })}
              className="w-full text-sm px-2 py-1.5 border border-gray-300 rounded-lg"
            >
              <option value="">— Select vehicle —</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registration}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Stops */}
      <div className="space-y-1.5">
        {route.stops.map((stop) => (
          <div key={stop.id} className="flex items-center gap-3 text-sm">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
              {stop.sequence}
            </span>
            <span className="flex-1 text-gray-700 truncate">{stop.shipment.order.customer.name} — {stop.location}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${statusColor(stop.status)}`}>{stop.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
