'use client'

interface Stop {
  id: string
  sequence: number
  location: string
  status: string
  timeWindowStart?: Date | null
  timeWindowEnd?: Date | null
}

interface ShipmentStopsProps {
  stops: Stop[]
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  ARRIVED: 'bg-blue-100 text-blue-700',
  DELIVERED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  SKIPPED: 'bg-gray-100 text-gray-700',
}

export default function ShipmentStops({ stops }: ShipmentStopsProps) {
  if (!stops || stops.length === 0) {
    return <p className="text-gray-500 text-sm">No stops assigned to this shipment.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-3 font-semibold text-gray-700">#</th>
            <th className="text-left py-3 px-3 font-semibold text-gray-700">Location</th>
            <th className="text-left py-3 px-3 font-semibold text-gray-700">Status</th>
            <th className="text-left py-3 px-3 font-semibold text-gray-700">Time Window</th>
          </tr>
        </thead>
        <tbody>
          {stops.map((stop) => (
            <tr key={stop.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-3 text-center font-bold text-gray-900">{stop.sequence}</td>
              <td className="py-3 px-3 text-gray-700">{stop.location}</td>
              <td className="py-3 px-3">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    STATUS_COLORS[stop.status] || 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {stop.status}
                </span>
              </td>
              <td className="py-3 px-3 text-gray-600 text-xs">
                {stop.timeWindowStart ? (
                  <>
                    {new Date(stop.timeWindowStart).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    -{' '}
                    {new Date(stop.timeWindowEnd!).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </>
                ) : (
                  'No window'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
