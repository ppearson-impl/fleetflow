'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import ShipmentTimeline from '@/components/shipment/shipment-timeline'
import ShipmentPodCard from '@/components/shipment/shipment-pod-card'
import ShipmentExceptions from '@/components/shipment/shipment-exceptions'
import ShipmentStops from '@/components/shipment/shipment-stops'
import { statusColor } from '@/lib/utils'

const ShipmentMap = dynamic(() => import('@/components/shipment/shipment-map'), {
  ssr: false,
  loading: () => <div className="h-80 bg-gray-100 rounded-xl animate-pulse" />,
})

interface DeliveryItem {
  id: string
  description: string
  quantity: number
  weight?: number | null
  volume?: number | null
}

interface Stop {
  id: string
  sequence: number
  location: string
  status: string
  lat?: number | null
  lng?: number | null
  timeWindowStart?: Date | null
  timeWindowEnd?: Date | null
}

interface Route {
  id: string
  name?: string | null
  driverId?: string | null
  driver?: { id: string; name: string } | null
  vehicle?: { id: string; registration: string; type?: string | null } | null
}

interface ShipmentEvent {
  id: string
  eventType: string
  description?: string | null
  actor?: string | null
  timestamp: Date
}

interface Exception {
  id: string
  type: string
  description: string
  status: string
  assignedTo?: string | null
  createdAt: Date
  resolvedAt?: Date | null
}

interface POD {
  id: string
  recipientName?: string | null
  signatureUrl?: string | null
  photoUrl?: string | null
  notes?: string | null
  deliveryTime: Date
}

interface ShipmentData {
  id: string
  status: string
  plannedDate?: Date | null
  trackingToken: string
  deliveryItems: DeliveryItem[]
  route: Route | null
  stops: Stop[]
  events: ShipmentEvent[]
  exceptions: Exception[]
  pod: POD | null
  order: {
    id: string
    reference: string
    customer: {
      id: string
      name: string
      contactEmail?: string | null
      contactPhone?: string | null
    }
  }
  origin: string
  destination: string
  originLat?: number | null
  originLng?: number | null
  destLat?: number | null
  destLng?: number | null
}

interface ShipmentDetailClientProps {
  shipment: ShipmentData
}

type TabType = 'overview' | 'timeline' | 'map' | 'documents'

export default function ShipmentDetailClient({ shipment }: ShipmentDetailClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  const tabs: Array<{ id: TabType; label: string; icon: string }> = [
    { id: 'overview', label: 'Overview', icon: '📦' },
    { id: 'timeline', label: 'Timeline', icon: '📋' },
    { id: 'map', label: 'Map', icon: '🗺️' },
    { id: 'documents', label: 'Documents', icon: '📄' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/shipments" className="text-gray-400 hover:text-gray-600 inline-block mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{shipment.order.customer.name}</h1>
              <p className="text-sm text-gray-500 font-mono mt-1">{shipment.order.reference}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${statusColor(shipment.status)}`}>
              {shipment.status}
            </span>
          </div>
        </div>
      </div>

      {/* Exceptions banner */}
      {shipment.exceptions.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 py-4">
          <ShipmentExceptions exceptions={shipment.exceptions} showBanner={true} />
        </div>
      )}

      {/* Tab navigation */}
      <div className="max-w-4xl mx-auto px-4 mt-4">
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Shipment info */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Shipment Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Order Reference</p>
                  <p className="text-sm font-mono text-gray-900">{shipment.order.reference}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Tracking Token</p>
                  <p className="text-sm font-mono text-gray-900">{shipment.trackingToken.slice(0, 8)}...</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Origin</p>
                  <p className="text-sm text-gray-900">{shipment.origin}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Destination</p>
                  <p className="text-sm text-gray-900">{shipment.destination}</p>
                </div>
                {shipment.plannedDate && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">Planned Date</p>
                    <p className="text-sm text-gray-900">
                      {new Date(shipment.plannedDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {shipment.route && (
                  <>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Assigned Route</p>
                      <p className="text-sm text-gray-900">{shipment.route.name || 'Unnamed Route'}</p>
                    </div>
                    {shipment.route.driver && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1">Driver</p>
                        <p className="text-sm text-gray-900">{shipment.route.driver.name}</p>
                      </div>
                    )}
                    {shipment.route.vehicle && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1">Vehicle</p>
                        <p className="text-sm text-gray-900">{shipment.route.vehicle.registration}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Delivery items */}
            {shipment.deliveryItems.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Delivery Items</h2>
                <div className="space-y-3">
                  {shipment.deliveryItems.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.description}</p>
                          <p className="text-xs text-gray-500 mt-1">Qty: {item.quantity}</p>
                        </div>
                        <div className="text-right text-xs text-gray-600">
                          {item.weight && <p>Weight: {item.weight}kg</p>}
                          {item.volume && <p>Volume: {item.volume}m³</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stops */}
            {shipment.stops.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Route Stops</h2>
                <ShipmentStops stops={shipment.stops} />
              </div>
            )}
          </div>
        )}

        {/* TIMELINE TAB */}
        {activeTab === 'timeline' && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Event Timeline</h2>
            <ShipmentTimeline events={shipment.events} />
          </div>
        )}

        {/* MAP TAB */}
        {activeTab === 'map' && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Route Map</h2>
            {shipment.originLat && shipment.originLng && shipment.destLat && shipment.destLng ? (
              <ShipmentMap
                originLat={shipment.originLat}
                originLng={shipment.originLng}
                destLat={shipment.destLat}
                destLng={shipment.destLng}
                stops={shipment.stops}
              />
            ) : (
              <div className="bg-gray-100 rounded-lg p-8 text-center text-gray-500">
                No location data available for this shipment.
              </div>
            )}
          </div>
        )}

        {/* DOCUMENTS TAB */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Proof of Delivery</h2>
              <ShipmentPodCard pod={shipment.pod} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
