'use client'

import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const originIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const destIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'hue-rotate-[90deg]', // green
})

const stopIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  shadowSize: [33, 33],
  className: 'hue-rotate-[-30deg]', // purple
})

interface Stop {
  id: string
  sequence: number
  location: string
  lat?: number | null
  lng?: number | null
  status: string
}

interface ShipmentMapProps {
  originLat: number
  originLng: number
  destLat: number
  destLng: number
  stops?: Stop[]
}

export default function ShipmentMap({
  originLat,
  originLng,
  destLat,
  destLng,
  stops = [],
}: ShipmentMapProps) {
  // Calculate bounds
  const lats = [originLat, destLat, ...stops.filter((s) => s.lat && s.lng).map((s) => s.lat!)]
  const lngs = [originLng, destLng, ...stops.filter((s) => s.lat && s.lng).map((s) => s.lng!)]

  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  const centerLat = (minLat + maxLat) / 2
  const centerLng = (minLng + maxLng) / 2

  // Create polyline path
  const pathPoints: [number, number][] = [
    [originLat, originLng],
    ...stops
      .filter((s) => s.lat && s.lng)
      .sort((a, b) => a.sequence - b.sequence)
      .map((s) => [s.lat!, s.lng!] as [number, number]),
    [destLat, destLng],
  ]

  return (
    <MapContainer
      center={[centerLat, centerLng]}
      zoom={8}
      scrollWheelZoom={false}
      zoomControl={false}
      style={{ height: '320px', width: '100%', borderRadius: '12px' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
      />

      {/* Route path */}
      {pathPoints.length > 1 && <Polyline positions={pathPoints} color="#3b82f6" weight={2} opacity={0.7} />}

      {/* Origin marker */}
      <Marker position={[originLat, originLng]} icon={originIcon}>
        <Popup>
          <div className="text-sm">
            <p className="font-semibold">Origin</p>
            <p className="text-gray-600">{originLat.toFixed(4)}, {originLng.toFixed(4)}</p>
          </div>
        </Popup>
      </Marker>

      {/* Stop markers */}
      {stops
        .filter((s) => s.lat && s.lng)
        .map((stop) => (
          <Marker key={stop.id} position={[stop.lat!, stop.lng!]} icon={stopIcon}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">Stop {stop.sequence}</p>
                <p className="text-gray-600">{stop.location}</p>
                <p className="text-xs text-gray-500 mt-1">{stop.status}</p>
              </div>
            </Popup>
          </Marker>
        ))}

      {/* Destination marker */}
      <Marker position={[destLat, destLng]} icon={destIcon}>
        <Popup>
          <div className="text-sm">
            <p className="font-semibold">Destination</p>
            <p className="text-gray-600">{destLat.toFixed(4)}, {destLng.toFixed(4)}</p>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  )
}
