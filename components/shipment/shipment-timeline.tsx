'use client'

interface ShipmentEvent {
  id: string
  eventType: string
  description?: string | null
  lat?: number | null
  lng?: number | null
  actor?: string | null
  timestamp: Date
}

interface ShipmentTimelineProps {
  events: ShipmentEvent[]
}

const EVENT_ICONS: Record<string, { icon: string; color: string }> = {
  CREATED: { icon: '📦', color: 'bg-gray-100' },
  PLANNED: { icon: '📋', color: 'bg-blue-100' },
  DISPATCHED: { icon: '🚚', color: 'bg-yellow-100' },
  ARRIVED: { icon: '📍', color: 'bg-purple-100' },
  DELIVERED: { icon: '✓', color: 'bg-green-100' },
  FAILED: { icon: '✗', color: 'bg-red-100' },
  GPS_PING: { icon: '📡', color: 'bg-cyan-100' },
  UPDATED: { icon: '🔄', color: 'bg-gray-100' },
}

export default function ShipmentTimeline({ events }: ShipmentTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No events recorded for this shipment yet.</p>
      </div>
    )
  }

  // Sort events by timestamp, newest first
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return (
    <div className="space-y-4">
      {sortedEvents.map((event, index) => {
        const eventConfig = EVENT_ICONS[event.eventType] || { icon: '•', color: 'bg-gray-100' }
        const timestamp = new Date(event.timestamp)
        const isLast = index === sortedEvents.length - 1

        return (
          <div key={event.id} className="flex gap-4">
            {/* Timeline dot and line */}
            <div className="flex flex-col items-center">
              <div className={`w-12 h-12 rounded-full ${eventConfig.color} flex items-center justify-center text-lg font-bold`}>
                {eventConfig.icon}
              </div>
              {!isLast && <div className="w-1 h-8 bg-gray-200 mt-2" />}
            </div>

            {/* Event content */}
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {event.eventType.replace(/_/g, ' ')}
                  </h4>
                  {event.description && (
                    <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                  )}
                  {event.actor && (
                    <p className="text-xs text-gray-500 mt-1">by {event.actor}</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {timestamp.toLocaleDateString()} at {timestamp.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
