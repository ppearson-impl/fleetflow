'use client'

import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet's default marker icon paths (broken by webpack asset hashing)
const stopIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const driverIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  shadowSize: [33, 33],
  className: 'hue-rotate-[120deg]', // tint driver marker green
})

interface StopMapProps {
  stopLat: number
  stopLng: number
  driverLat?: number | null
  driverLng?: number | null
}

export default function StopMap({ stopLat, stopLng, driverLat, driverLng }: StopMapProps) {
  return (
    <MapContainer
      center={[stopLat, stopLng]}
      zoom={15}
      scrollWheelZoom={false}
      zoomControl={false}
      style={{ height: '180px', width: '100%', borderRadius: '12px' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
      />
      <Marker position={[stopLat, stopLng]} icon={stopIcon} />
      {driverLat != null && driverLng != null && (
        <Marker position={[driverLat, driverLng]} icon={driverIcon} />
      )}
    </MapContainer>
  )
}
