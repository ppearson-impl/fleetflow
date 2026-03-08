'use client'

interface Exception {
  id: string
  type: string
  description: string
  status: string
  assignedTo?: string | null
  createdAt: Date
  resolvedAt?: Date | null
}

interface ShipmentExceptionsProps {
  exceptions: Exception[]
  showBanner?: boolean
}

const EXCEPTION_COLORS: Record<string, string> = {
  LATE_DELIVERY: 'bg-orange-50 border-orange-200 text-orange-700',
  MISSED_TIME_WINDOW: 'bg-amber-50 border-amber-200 text-amber-700',
  VEHICLE_BREAKDOWN: 'bg-red-50 border-red-200 text-red-700',
  DRIVER_INCIDENT: 'bg-red-50 border-red-200 text-red-700',
  CUSTOMER_UNAVAILABLE: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  DAMAGED_GOODS: 'bg-pink-50 border-pink-200 text-pink-700',
  OTHER: 'bg-gray-50 border-gray-200 text-gray-700',
}

const STATUS_ICONS: Record<string, string> = {
  OPEN: '⚠️',
  IN_PROGRESS: '🔄',
  RESOLVED: '✓',
  CLOSED: '✓',
}

export default function ShipmentExceptions({ exceptions, showBanner = true }: ShipmentExceptionsProps) {
  if (!exceptions || exceptions.length === 0) return null

  const openExceptions = exceptions.filter((e) => e.status === 'OPEN' || e.status === 'IN_PROGRESS')

  // Show banner if requested
  if (showBanner && openExceptions.length > 0) {
    return (
      <div className={`border rounded-xl p-4 ${EXCEPTION_COLORS.LATE_DELIVERY}`}>
        <div className="flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <h3 className="font-semibold text-sm">
              {openExceptions.length} Active Exception{openExceptions.length > 1 ? 's' : ''}
            </h3>
            <div className="space-y-1 mt-2">
              {openExceptions.map((exc) => (
                <p key={exc.id} className="text-xs">
                  {exc.type.replace(/_/g, ' ')}: {exc.description}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show full list
  return (
    <div className="space-y-3">
      {exceptions.map((exc) => {
        const colors = EXCEPTION_COLORS[exc.type] || EXCEPTION_COLORS.OTHER
        const statusIcon = STATUS_ICONS[exc.status] || '•'

        return (
          <div key={exc.id} className={`border rounded-xl p-4 ${colors}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span>{statusIcon}</span>
                  <h4 className="font-semibold text-sm">{exc.type.replace(/_/g, ' ')}</h4>
                </div>
                <p className="text-sm mt-1">{exc.description}</p>
                {exc.assignedTo && (
                  <p className="text-xs mt-2 opacity-75">Assigned to: {exc.assignedTo}</p>
                )}
                <p className="text-xs opacity-60 mt-1">
                  Created {new Date(exc.createdAt).toLocaleDateString()}
                  {exc.resolvedAt && (
                    <>, resolved {new Date(exc.resolvedAt).toLocaleDateString()}</>
                  )}
                </p>
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-lg bg-white/50">
                {exc.status}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
