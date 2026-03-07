'use client'

import { useState } from 'react'
import { formatDate, statusColor } from '@/lib/utils'
import dynamic from 'next/dynamic'

const PlanningMap = dynamic(() => import('@/components/map/planning-map'), { ssr: false })

interface Shipment {
  id: string
  origin: string
  destination: string
  destLat: number | null
  destLng: number | null
  status: string
  plannedDate: Date | null
  order: { reference: string; customer: { name: string } }
}

interface Stop {
  id: string
  sequence: number
  location: string
  status: string
  lat: number | null
  lng: number | null
  shipment: Shipment
}

interface Route {
  id: string
  name: string | null
  status: string
  distanceKm: number | null
  estimatedDuration: number | null
  driver: { id: string; name: string } | null
  vehicle: { id: string; registration: string } | null
  stops: Stop[]
}

interface Driver { id: string; name: string }
interface Vehicle { id: string; registration: string }

interface PlanningData {
  unplannedShipments: Shipment[]
  routes: Route[]
  drivers: Driver[]
  vehicles: Vehicle[]
}

export function PlanningBoardClient({ data }: { data: PlanningData }) {
  const [unplanned, setUnplanned] = useState(data.unplannedShipments)
  const [routes, setRoutes] = useState(data.routes)
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(data.routes[0] || null)
  const [creating, setCreating] = useState(false)
  const [optimizing, setOptimizing] = useState(false)

  async function createRoute() {
    setCreating(true)
    const res = await fetch('/api/routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Route ${new Date().toLocaleDateString('en-GB')}` }),
    })
    if (res.ok) {
      const route = await res.json()
      const newRoute = { ...route, stops: [], driver: null, vehicle: null }
      setRoutes((prev) => [newRoute, ...prev])
      setSelectedRoute(newRoute)
    }
    setCreating(false)
  }

  async function addShipmentToRoute(shipmentId: string) {
    if (!selectedRoute) return
    const shipment = unplanned.find((s) => s.id === shipmentId)
    if (!shipment) return

    const res = await fetch('/api/routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: selectedRoute.name, shipmentIds: [shipmentId] }),
    })
    if (!res.ok) return

    setUnplanned((prev) => prev.filter((s) => s.id !== shipmentId))
    setRoutes((prev) =>
      prev.map((r) =>
        r.id === selectedRoute.id
          ? {
              ...r,
              stops: [
                ...r.stops,
                {
                  id: `tmp-${Date.now()}`,
                  sequence: r.stops.length + 1,
                  location: shipment.destination,
                  status: 'PENDING',
                  lat: shipment.destLat,
                  lng: shipment.destLng,
                  shipment,
                },
              ],
            }
          : r
      )
    )
  }

  async function optimize() {
    if (!selectedRoute) return
    setOptimizing(true)
    await fetch('/api/routes/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routeId: selectedRoute.id }),
    })
    // Reload
    const res = await fetch(`/api/routes/${selectedRoute.id}`)
    if (res.ok) {
      const updated = await res.json()
      setRoutes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      setSelectedRoute(updated)
    }
    setOptimizing(false)
  }

  async function assignDriver(driverId: string) {
    if (!selectedRoute) return
    await fetch(`/api/routes/${selectedRoute.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId }),
    })
    const driver = data.drivers.find((d) => d.id === driverId) || null
    setRoutes((prev) => prev.map((r) => r.id === selectedRoute.id ? { ...r, driver } : r))
    setSelectedRoute((prev) => prev ? { ...prev, driver } : prev)
  }

  return (
    <div className="flex h-full" style={{ height: 'calc(100vh - 0px)' }}>
      {/* Left panel: unplanned shipments */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Unplanned</h2>
          <p className="text-xs text-gray-500">{unplanned.length} shipments</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {unplanned.map((s) => (
            <div
              key={s.id}
              className="p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition"
              onClick={() => addShipmentToRoute(s.id)}
              title="Click to add to selected route"
            >
              <div className="font-mono text-xs text-blue-600 mb-1">{s.order.reference}</div>
              <div className="text-sm font-medium text-gray-900 truncate">{s.order.customer.name}</div>
              <div className="text-xs text-gray-500 truncate mt-0.5">→ {s.destination}</div>
              {s.plannedDate && <div className="text-xs text-gray-400 mt-1">{formatDate(s.plannedDate)}</div>}
            </div>
          ))}
          {unplanned.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-8">All shipments planned</div>
          )}
        </div>
      </div>

      {/* Middle: map */}
      <div className="flex-1 relative">
        <PlanningMap
          stops={selectedRoute?.stops || []}
          unplanned={unplanned}
        />
      </div>

      {/* Right panel: routes */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Routes</h2>
            <p className="text-xs text-gray-500">{routes.length} total</p>
          </div>
          <button
            onClick={createRoute}
            disabled={creating}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {creating ? '...' : '+ New'}
          </button>
        </div>

        {/* Route list */}
        <div className="flex-1 overflow-y-auto">
          {routes.map((route) => (
            <div
              key={route.id}
              onClick={() => setSelectedRoute(route)}
              className={`p-4 border-b border-gray-100 cursor-pointer transition ${
                selectedRoute?.id === route.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm text-gray-900 truncate">{route.name || 'Unnamed Route'}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${statusColor(route.status)}`}>{route.status}</span>
              </div>
              <div className="text-xs text-gray-500 space-y-0.5">
                <div>{route.stops.length} stops</div>
                {route.driver && <div>Driver: {route.driver.name}</div>}
                {route.distanceKm && <div>{route.distanceKm} km</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Selected route detail */}
        {selectedRoute && (
          <div className="border-t border-gray-200 p-4 space-y-3">
            <div className="flex gap-2">
              <button
                onClick={optimize}
                disabled={optimizing || selectedRoute.stops.length < 2}
                className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-40"
              >
                {optimizing ? 'Optimising...' : 'Optimise Route'}
              </button>
              <a
                href={`/dispatch?routeId=${selectedRoute.id}`}
                className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 text-center"
              >
                Dispatch
              </a>
            </div>

            {/* Driver assign */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Assign Driver</label>
              <select
                value={selectedRoute.driver?.id || ''}
                onChange={(e) => assignDriver(e.target.value)}
                className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded-lg"
              >
                <option value="">— Select driver —</option>
                {data.drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Stop list */}
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {selectedRoute.stops.map((stop, i) => (
                <div key={stop.id} className="flex items-start gap-2 text-xs">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">{stop.shipment.order.customer.name}</div>
                    <div className="text-gray-500 truncate">{stop.location}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
