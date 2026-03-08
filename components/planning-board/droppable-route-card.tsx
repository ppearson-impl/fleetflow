'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import Link from 'next/link'
import { DraggableStopHandle } from './draggable-stop-handle'

interface Stop {
  id: string
  sequence: number
  location: string
  status: string
}

interface Shipment {
  id: string
  reference: string
  origin: string
  destination: string
  status: string
}

interface RouteCardProps {
  id: string
  name: string
  status: string
  driver?: { name: string } | null
  vehicle?: { registration: string } | null
  distanceKm?: number | null
  stops: Stop[]
  shipments: Shipment[]
  onOptimize?: (routeId: string) => void
}

export function DroppableRouteCard({
  id,
  name,
  status,
  driver,
  vehicle,
  distanceKm,
  stops,
  shipments,
  onOptimize,
}: RouteCardProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `route-${id}`,
    data: { type: 'route', routeId: id },
  })

  const stopIds = stops.map(s => `stop-${id}-${s.id}`)

  return (
    <div
      ref={setNodeRef}
      className={`bg-white rounded-xl border-2 p-4 transition ${
        isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{name}</h3>
          <p className="text-sm text-gray-600 mt-0.5">
            {driver?.name || 'Unassigned'} • {vehicle?.registration || 'No vehicle'}
          </p>
        </div>
        <span className={`text-xs px-2 py-1 rounded font-medium ${
          status === 'PLANNED' ? 'bg-blue-100 text-blue-700' :
          status === 'DISPATCHED' ? 'bg-green-100 text-green-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {status}
        </span>
      </div>

      {/* Route Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4 pt-3 border-t border-gray-200">
        <div>
          <div className="text-xs text-gray-600">Distance</div>
          <div className="text-sm font-bold text-gray-900">{distanceKm?.toFixed(1) || '—'} km</div>
        </div>
        <div>
          <div className="text-xs text-gray-600">Stops</div>
          <div className="text-sm font-bold text-gray-900">{stops.length}</div>
        </div>
      </div>

      {/* Stops (Draggable) */}
      {stops.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-700 mb-2">Stop Sequence</div>
          <SortableContext items={stopIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {stops.map((stop, idx) => (
                <DraggableStopHandle
                  key={stop.id}
                  id={stop.id}
                  routeId={id}
                  sequence={idx + 1}
                  location={stop.location}
                  status={stop.status}
                />
              ))}
            </div>
          </SortableContext>
        </div>
      )}

      {/* Shipments assigned to this route */}
      {shipments.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-semibold text-gray-700 mb-1">Shipments</div>
          <div className="space-y-1 text-xs">
            {shipments.map(ship => (
              <div key={ship.id} className="flex items-center gap-2">
                <span className="text-gray-400">•</span>
                <span className="text-gray-600 font-mono">{ship.reference}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-200">
        <button
          onClick={() => onOptimize?.(id)}
          className="flex-1 text-xs font-medium text-blue-600 hover:text-blue-700 px-2 py-1.5 rounded hover:bg-blue-50 transition"
        >
          Optimize
        </button>
        <Link
          href={`/dispatch?routeId=${id}`}
          className="flex-1 text-xs font-medium text-gray-600 hover:text-gray-700 px-2 py-1.5 rounded hover:bg-gray-100 transition text-center"
        >
          View Details
        </Link>
      </div>
    </div>
  )
}
