import { prisma } from '@/lib/prisma'
import { formatDateTime } from '@/lib/utils'

export default async function CustomerTrackingPage({ params }: { params: { token: string } }) {
  const shipment = await prisma.shipment.findUnique({
    where: { trackingToken: params.token },
    include: {
      order: { include: { customer: true } },
      route: { include: { driver: true, vehicle: true } },
      stops: { orderBy: { sequence: 'asc' } },
      events: { orderBy: { timestamp: 'asc' } },
      pod: true,
    },
  })

  if (!shipment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tracking not found</h1>
          <p className="text-gray-500">This tracking link is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  const statusSteps = [
    { status: 'PENDING', label: 'Order Received' },
    { status: 'PLANNED', label: 'Planned' },
    { status: 'DISPATCHED', label: 'Dispatched' },
    { status: 'IN_TRANSIT', label: 'In Transit' },
    { status: 'DELIVERED', label: 'Delivered' },
  ]

  const currentStepIdx = statusSteps.findIndex((s) => s.status === shipment.status)

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Track Your Shipment</h1>
          <p className="text-gray-500 mt-1 font-mono">{shipment.order.reference}</p>
        </div>

        {/* Status progress */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <div className="flex items-center">
            {statusSteps.map((step, i) => {
              const done = i <= currentStepIdx && shipment.status !== 'FAILED' && shipment.status !== 'CANCELLED'
              const active = i === currentStepIdx
              return (
                <div key={step.status} className="flex-1 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-1 ${
                    done ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
                  } ${active ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}>
                    {done && i < currentStepIdx ? '✓' : i + 1}
                  </div>
                  <div className={`text-xs text-center ${done ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                    {step.label}
                  </div>
                  {i < statusSteps.length - 1 && (
                    <div className="absolute" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Details */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Origin</div>
              <div className="text-sm text-gray-900">{shipment.origin}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Destination</div>
              <div className="text-sm text-gray-900">{shipment.destination}</div>
            </div>
            {shipment.plannedDate && (
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Planned Date</div>
                <div className="text-sm text-gray-900">{formatDateTime(shipment.plannedDate)}</div>
              </div>
            )}
            {shipment.route?.driver && (
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Driver</div>
                <div className="text-sm text-gray-900">{shipment.route.driver.name}</div>
              </div>
            )}
          </div>
        </div>

        {/* POD */}
        {shipment.pod && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-4">
            <h2 className="font-semibold text-green-800 mb-3">Proof of Delivery</h2>
            <div className="space-y-2 text-sm">
              {shipment.pod.recipientName && (
                <div><span className="text-green-600">Received by:</span> <span className="text-gray-900">{shipment.pod.recipientName}</span></div>
              )}
              <div><span className="text-green-600">Delivered:</span> <span className="text-gray-900">{formatDateTime(shipment.pod.deliveryTime)}</span></div>
              {shipment.pod.notes && <div className="text-gray-600">{shipment.pod.notes}</div>}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Shipment Timeline</h2>
          <div className="space-y-3">
            {shipment.events.map((event, i) => (
              <div key={event.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5" />
                  {i < shipment.events.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                </div>
                <div className="pb-3">
                  <div className="text-sm font-medium text-gray-900">{event.eventType.replace(/_/g, ' ')}</div>
                  {event.description && <div className="text-xs text-gray-500">{event.description}</div>}
                  <div className="text-xs text-gray-400 mt-0.5">{formatDateTime(event.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
