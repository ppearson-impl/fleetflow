import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate, statusColor } from '@/lib/utils'

export default async function DriverHomePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // Find driver record for this user
  const driver = await prisma.driver.findFirst({
    where: { tenantId: session.tenantId, email: session.email },
  })

  const routes = driver
    ? await prisma.route.findMany({
        where: {
          driverId: driver.id,
          status: { in: ['DISPATCHED', 'IN_PROGRESS'] },
        },
        include: {
          stops: {
            orderBy: { sequence: 'asc' },
            include: { shipment: { include: { order: { include: { customer: true } }, pod: true } } },
          },
          vehicle: true,
        },
        orderBy: { plannedStart: 'asc' },
      })
    : []

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 pt-12 pb-6">
        <div className="text-sm opacity-75 mb-1">Good day,</div>
        <h1 className="text-2xl font-bold">{session.name}</h1>
        <div className="text-sm opacity-75 mt-1">
          {routes.reduce((acc, r) => acc + r.stops.length, 0)} stops today
        </div>
      </div>

      {/* Routes */}
      <div className="px-4 pt-4 space-y-4">
        {routes.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <svg className="w-16 h-16 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>No active routes assigned</p>
          </div>
        )}

        {routes.map((route) => {
          const completed = route.stops.filter((s) => s.status === 'DELIVERED').length
          const progress = route.stops.length > 0 ? (completed / route.stops.length) * 100 : 0

          return (
            <div key={route.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold text-gray-900">{route.name || 'Today\'s Route'}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColor(route.status)}`}>
                    {route.status.replace(/_/g, ' ')}
                  </span>
                </div>
                {route.vehicle && (
                  <p className="text-xs text-gray-500 mb-3">Vehicle: {route.vehicle.registration}</p>
                )}

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{completed} delivered</span>
                    <span>{route.stops.length - completed} remaining</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                {/* Stops */}
                <div className="space-y-2">
                  {route.stops.map((stop) => (
                    <Link
                      key={stop.id}
                      href={`/driver/route/${route.id}?stopId=${stop.id}`}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                        stop.status === 'DELIVERED' ? 'bg-green-50 border-green-200' :
                        stop.status === 'FAILED' ? 'bg-red-50 border-red-200' :
                        'bg-gray-50 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        stop.status === 'DELIVERED' ? 'bg-green-500 text-white' :
                        stop.status === 'FAILED' ? 'bg-red-500 text-white' :
                        'bg-blue-600 text-white'
                      }`}>
                        {stop.status === 'DELIVERED' ? '✓' : stop.status === 'FAILED' ? '✗' : stop.sequence}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {stop.shipment.order.customer.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{stop.location}</p>
                      </div>
                      {stop.status === 'PENDING' && (
                        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
