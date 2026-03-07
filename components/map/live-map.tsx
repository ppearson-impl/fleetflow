'use client'

import { useEffect, useRef } from 'react'

interface TrackingEvent {
  id: string
  shipmentId: string
  lat: number | null
  lng: number | null
  shipment: {
    order: { reference: string; customer: { name: string } }
    destination: string
    route: { driver: { name: string } | null } | null
  }
}

export default function LiveMap({ events }: { events: TrackingEvent[] }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())

  useEffect(() => {
    if (!mapRef.current) return
    import('leaflet').then((L) => {
      if (!mapInstance.current) {
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
      }

      const map = mapInstance.current!

      // Add/update markers
      const seenIds = new Set<string>()

      for (const event of events) {
        if (!event.lat || !event.lng) continue
        seenIds.add(event.shipmentId)

        const icon = L.divIcon({
          html: `<div style="background:#2563eb;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">
            <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M18.364 4.636a9 9 0 010 12.728M15.536 7.464a5 5 0 010 7.072M12 13a1 1 0 100-2 1 1 0 000 2zm0 0v8"/></svg>
          </div>`,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        })

        if (markersRef.current.has(event.shipmentId)) {
          markersRef.current.get(event.shipmentId)!.setLatLng([event.lat, event.lng])
        } else {
          const marker = L.marker([event.lat, event.lng], { icon })
          marker.bindPopup(`
            <b>${event.shipment.order.customer.name}</b><br>
            ${event.shipment.order.reference}<br>
            ${event.shipment.route?.driver?.name ? `Driver: ${event.shipment.route.driver.name}<br>` : ''}
            → ${event.shipment.destination}
          `)
          marker.addTo(map)
          markersRef.current.set(event.shipmentId, marker)
        }
      }

      // Remove stale markers
      Array.from(markersRef.current.entries()).forEach(([id, marker]) => {
        if (!seenIds.has(id)) {
          map.removeLayer(marker)
          markersRef.current.delete(id)
        }
      })

      // Fit bounds
      if (seenIds.size > 0) {
        const coords = events
          .filter((e) => e.lat && e.lng)
          .map((e) => [e.lat!, e.lng!] as [number, number])
        if (coords.length > 0) {
          map.fitBounds(coords, { padding: [40, 40], maxZoom: 12 })
        }
      }
    })
  }, [events])

  return <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
}
