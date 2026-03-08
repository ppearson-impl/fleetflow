'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Stop {
  id: string
  sequence: number
  location: string
  lat: number | null
  lng: number | null
  status: string
}

interface DriverLocation {
  driverId: string
  lat: number
  lng: number
  accuracy?: number
  speed?: number
  bearing?: number
  timestamp: number
}

interface DispatchLiveMapProps {
  stops: Stop[]
  routeName?: string
  onDriverLocationUpdate?: (location: DriverLocation) => void
}

const DEFAULT_DEPOT = { lat: 51.5074, lng: -0.1278 } // London

export function DispatchLiveMap({
  stops,
  routeName,
  onDriverLocationUpdate,
}: DispatchLiveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const markersRef = useRef<{ [key: string]: any }>({})
  const polylineRef = useRef<L.Polyline | null>(null)
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null)

  useEffect(() => {
    if (!mapContainer.current) return

    // Initialize map
    map.current = L.map(mapContainer.current).setView(
      [DEFAULT_DEPOT.lat, DEFAULT_DEPOT.lng],
      11
    )

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map.current)

    // Add depot marker
    L.circleMarker([DEFAULT_DEPOT.lat, DEFAULT_DEPOT.lng], {
      radius: 8,
      fillColor: '#3B82F6',
      color: '#1E40AF',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8,
    }).addTo(map.current).bindPopup('Depot')

    // Add stop markers
    const stopCoords: [number, number][] = []
    stops.forEach((stop, idx) => {
      if (stop.lat && stop.lng) {
        stopCoords.push([stop.lat, stop.lng])

        const statusColor = {
          DELIVERED: '#10B981',
          ARRIVED: '#3B82F6',
          PENDING: '#EF4444',
        }[stop.status] || '#6B7280'

        const marker = L.circleMarker([stop.lat, stop.lng], {
          radius: 6,
          fillColor: statusColor,
          color: '#1F2937',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
        }).addTo(map.current!)

        marker.bindPopup(`
          <div class="text-sm">
            <div class="font-bold">Stop ${idx + 1}</div>
            <div class="text-xs text-gray-600">${stop.location}</div>
            <div class="text-xs font-medium mt-1">${stop.status}</div>
          </div>
        `)

        markersRef.current[stop.id] = marker
      }
    })

    // Draw route polyline
    if (stopCoords.length > 0) {
      const routeCoords: [number, number][] = [
        [DEFAULT_DEPOT.lat, DEFAULT_DEPOT.lng],
        ...stopCoords,
      ]

      polylineRef.current = L.polyline(routeCoords, {
        color: '#3B82F6',
        weight: 3,
        opacity: 0.7,
        dashArray: '5, 5',
      }).addTo(map.current)

      // Fit bounds
      const bounds = L.latLngBounds(routeCoords)
      map.current.fitBounds(bounds, { padding: [50, 50] })
    }

    // Simulate driver location updates (in production, would use Socket.io)
    const simulateDriverUpdate = () => {
      if (stops.length === 0) return

      // Random position between first and last stop
      const randomStop = stops[Math.floor(Math.random() * stops.length)]
      if (randomStop.lat && randomStop.lng) {
        const jitter = 0.01
        const lat = randomStop.lat + (Math.random() - 0.5) * jitter
        const lng = randomStop.lng + (Math.random() - 0.5) * jitter

        const location = {
          driverId: 'current-driver',
          lat,
          lng,
          accuracy: 10,
          speed: Math.random() * 50,
          timestamp: Date.now(),
        }

        setDriverLocation(location)
        onDriverLocationUpdate?.(location)

        // Update or create driver marker
        if (markersRef.current['driver']) {
          markersRef.current['driver'].setLatLng([lat, lng])
        } else {
          const driverMarker = L.circleMarker([lat, lng], {
            radius: 8,
            fillColor: '#F59E0B',
            color: '#D97706',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9,
          }).addTo(map.current!)

          driverMarker.bindPopup(
            `<div class="text-sm"><div class="font-bold">Driver</div><div class="text-xs">Speed: ${Math.round(location.speed || 0)} km/h</div></div>`
          )

          markersRef.current['driver'] = driverMarker
        }

        // Pan to driver if close to viewport edge
        const driverLatLng = L.latLng(lat, lng)
        if (map.current && !map.current.getBounds().contains(driverLatLng)) {
          map.current.panTo(driverLatLng)
        }
      }
    }

    // Simulate updates every 5 seconds (for demo)
    const interval = setInterval(simulateDriverUpdate, 5000)

    return () => {
      clearInterval(interval)
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [stops, onDriverLocationUpdate])

  return (
    <div className="w-full h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <h3 className="text-sm font-semibold text-gray-900">{routeName || 'Route Map'}</h3>
        {driverLocation && (
          <p className="text-xs text-gray-600 mt-1">
            Driver speed: {Math.round(driverLocation.speed || 0)} km/h
          </p>
        )}
      </div>
      <div ref={mapContainer} className="flex-1" style={{ minHeight: '400px' }} />
    </div>
  )
}
