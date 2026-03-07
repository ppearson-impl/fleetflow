'use client'

import { useEffect, useRef } from 'react'

interface MapStop {
  id: string
  sequence: number
  location: string
  lat: number | null
  lng: number | null
  shipment: {
    order: { reference: string; customer: { name: string } }
    destination: string
  }
}

interface UnplannedShipment {
  id: string
  destination: string
  destLat: number | null
  destLng: number | null
  order: { reference: string; customer: { name: string } }
}

export default function PlanningMap({
  stops,
  unplanned,
}: {
  stops: MapStop[]
  unplanned: UnplannedShipment[]
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markersLayer = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return

    // Dynamic import to avoid SSR
    import('leaflet').then((L) => {
      if (mapInstance.current) {
        markersLayer.current?.clearLayers()
      } else {
        // Fix default icon path
        delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        })

        const map = L.map(mapRef.current!).setView([51.5074, -0.1278], 7)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(map)
        mapInstance.current = map
        markersLayer.current = L.layerGroup().addTo(map)
      }

      const layer = markersLayer.current!
      layer.clearLayers()

      // Planned stops (blue numbered markers)
      const plannedCoords: [number, number][] = []
      stops.forEach((stop, i) => {
        if (stop.lat && stop.lng) {
          const icon = L.divIcon({
            html: `<div style="background:#2563eb;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)">${i + 1}</div>`,
            className: '',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          })
          const marker = L.marker([stop.lat, stop.lng], { icon })
          marker.bindPopup(`<b>${stop.shipment.order.customer.name}</b><br>${stop.location}`)
          layer.addLayer(marker)
          plannedCoords.push([stop.lat, stop.lng])
        }
      })

      // Draw route polyline
      if (plannedCoords.length > 1) {
        const L2 = L as typeof import('leaflet')
        L2.polyline(plannedCoords, { color: '#2563eb', weight: 3, dashArray: '8,4' }).addTo(layer)
      }

      // Unplanned stops (grey markers)
      unplanned.forEach((s) => {
        if (s.destLat && s.destLng) {
          const icon = L.divIcon({
            html: `<div style="background:#6b7280;color:white;width:20px;height:20px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
            className: '',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          })
          const marker = L.marker([s.destLat, s.destLng], { icon })
          marker.bindPopup(`<b>${s.order.customer.name}</b><br>${s.destination}<br><em>Unplanned</em>`)
          layer.addLayer(marker)
        }
      })

      // Fit bounds
      const allCoords: [number, number][] = [
        ...plannedCoords,
        ...unplanned.filter((s) => s.destLat && s.destLng).map((s) => [s.destLat!, s.destLng!] as [number, number]),
      ]
      if (allCoords.length > 0) {
        mapInstance.current!.fitBounds(allCoords, { padding: [40, 40] })
      }
    })
  }, [stops, unplanned])

  return (
    <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
  )
}
