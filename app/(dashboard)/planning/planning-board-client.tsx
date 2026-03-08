'use client'

import { useState } from 'react'
import { formatDate, statusColor } from '@/lib/utils'
import dynamic from 'next/dynamic'
import { DndContext, DragEndEvent } from '@dnd-kit/core'
import { DraggableShipmentItem } from '@/components/planning-board/draggable-shipment-item'
import { DroppableRouteCard } from '@/components/planning-board/droppable-route-card'
import { assignShipmentToRoute, reassignShipment, unassignShipment } from '@/lib/planner/route-assignment'

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

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (!over) return

    // Extract IDs from drag IDs (format: "shipment-{id}" or "route-{id}" or "stop-{routeId}-{id}")
    const activeData = active.data.current
    const overData = over.data.current

    if (!activeData || !overData) return

    // Handle shipment → route assignment
    if (activeData.type === 'shipment' && overData.type === 'route') {
      const shipmentId = activeData.shipmentId
      const routeId = overData.routeId

      try {
        // API call to assign shipment
        const res = await fetch(`/api/routes/${routeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shipmentIds: [shipmentId] }),
        })

        if (res.ok) {
          // Update local state
          const shipment = unplanned.find((s) => s.id === shipmentId)
          if (shipment) {
            setUnplanned((prev) => prev.filter((s) => s.id !== shipmentId))
            setRoutes((prev) =>
              prev.map((r) =>
                r.id === routeId
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
        }
      } catch (error) {
        console.error('Failed to assign shipment:', error)
      }
    }

    // Handle shipment → different route (reassignment)
    if (activeData.type === 'shipment' && overData.type === 'route') {
      // Same logic as above for now
      // In future, can add swap/reassignment logic
    }
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex h-full" style={{ height: 'calc(100vh - 0px)' }}>
        {/* Left panel: unplanned shipments */}
        <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Unplanned</h2>
            <p className="text-xs text-gray-500">{unplanned.length} shipments</p>
            <p className="text-xs text-gray-400 mt-1">Drag to routes →</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {unplanned.map((s) => (
              <DraggableShipmentItem
                key={s.id}
                id={s.id}
                reference={s.order.reference}
                customer={s.order.customer.name}
                origin={s.origin}
                destination={s.destination}
                status={s.status}
              />
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
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
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
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {routes.map((route) => {
            const routeShipments = route.stops.map((s) => s.shipment).filter((s) => s).map((s) => ({
              id: s.id,
              reference: s.order.reference,
              origin: s.origin,
              destination: s.destination,
              status: s.status,
            }))
            return (
              <div
                key={route.id}
                onClick={() => setSelectedRoute(route)}
                className={`cursor-pointer transition ${
                  selectedRoute?.id === route.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <DroppableRouteCard
                  id={route.id}
                  name={route.name || 'Unnamed Route'}
                  status={route.status}
                  driver={route.driver}
                  vehicle={route.vehicle}
                  distanceKm={route.distanceKm}
                  stops={route.stops}
                  shipments={routeShipments}
                  onOptimize={() => optimize()}
                />
              </div>
            )
          })}
          {routes.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-8">No routes created. Click "+ New" to create one.</div>
          )}
        </div>

        {/* Selected route detail */}
        {selectedRoute && (
          <div className="border-t border-gray-200 p-4 space-y-3">
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

            <a
              href={`/dispatch?routeId=${selectedRoute.id}`}
              className="w-full block px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 text-center"
            >
              Dispatch This Route
            </a>
          </div>
        )}
      </div>
      </div>
    </DndContext>
  )
}
