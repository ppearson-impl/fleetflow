'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { formatDateTime } from '@/lib/utils'

const LiveMap = dynamic(() => import('@/components/map/live-map'), { ssr: false })

interface TrackingEvent {
  id: string
  shipmentId: string
  lat: number | null
  lng: number | null
  timestamp: string
  shipment: {
    id: string
    origin: string
    destination: string
    status: string
    route: {
      driver: { name: string; phone?: string | null } | null
    } | null
    order: { reference: string; customer: { name: string } }
  }
}

export function LiveTrackingClient() {
  const [events, setEvents] = useState<TrackingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  async function fetchData() {
    const res = await fetch('/api/tracking')
    if (res.ok) {
      const data = await res.json()
      setEvents(data)
      setLastRefresh(new Date())
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30_000) // refresh every 30s
    return () => clearInterval(interval)
  }, [])

  const activeDrivers = new Set(events.map((e) => e.shipment.route?.driver?.name).filter(Boolean)).size

  return (
    <div className="flex h-full" style={{ height: 'calc(100vh - 0px)' }}>
      {/* Map */}
      <div className="flex-1 relative">
        {!loading && <LiveMap events={events} />}
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow px-3 py-2 text-xs text-gray-500 z-10">
          Auto-refresh 30s · Last: {formatDateTime(lastRefresh)}
        </div>
      </div>

      {/* Side panel */}
      <div className="w-72 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Live Tracking</h2>
          <div className="text-xs text-gray-500 mt-1">
            {activeDrivers} drivers · {events.length} active shipments
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {events.length === 0 && !loading && (
            <div className="p-6 text-center text-gray-400 text-sm">
              No active GPS pings in the last hour
            </div>
          )}
          {events.map((event) => (
            <div key={event.id} className="p-3 border-b border-gray-50 hover:bg-gray-50">
              <div className="font-medium text-sm text-gray-900 truncate">
                {event.shipment.order.customer.name}
              </div>
              <div className="text-xs text-gray-500 font-mono">{event.shipment.order.reference}</div>
              {event.shipment.route?.driver && (
                <div className="text-xs text-blue-600 mt-0.5">
                  Driver: {event.shipment.route.driver.name}
                </div>
              )}
              <div className="text-xs text-gray-400 mt-0.5 truncate">
                → {event.shipment.destination}
              </div>
              {event.lat && event.lng && (
                <div className="text-xs text-gray-400 font-mono">
                  {event.lat.toFixed(4)}, {event.lng.toFixed(4)}
                </div>
              )}
              <div className="text-xs text-gray-300 mt-1">{formatDateTime(event.timestamp)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
