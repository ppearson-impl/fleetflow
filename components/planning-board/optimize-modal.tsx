'use client'

import { useState } from 'react'
import { TrendingDown } from 'lucide-react'

interface OptimizeModalProps {
  routeId: string
  routeName: string
  currentDistance: number
  currentStops: number
  onApply?: () => void
  onClose?: () => void
  optimizedDistance?: number
}

export function OptimizeModal({
  routeId,
  routeName,
  currentDistance,
  currentStops,
  onApply,
  onClose,
  optimizedDistance,
}: OptimizeModalProps) {
  const [isApplying, setIsApplying] = useState(false)

  const optimization = optimizedDistance ? {
    saved: currentDistance - optimizedDistance,
    percent: Math.round(((currentDistance - optimizedDistance) / currentDistance) * 100),
  } : null

  async function handleApply() {
    setIsApplying(true)
    try {
      const res = await fetch(`/api/routes/${routeId}/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (res.ok) {
        onApply?.()
      }
    } catch (error) {
      console.error('Failed to apply optimization:', error)
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Route Optimization</h2>
          <p className="text-sm text-gray-600 mt-1">{routeName}</p>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Current Route */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Current Route</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Distance</span>
                <span className="text-sm font-bold text-gray-900">{currentDistance.toFixed(1)} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Stops</span>
                <span className="text-sm font-bold text-gray-900">{currentStops}</span>
              </div>
            </div>
          </div>

          {/* Optimization Result */}
          {optimization && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Optimized Route</h3>
              <div className="bg-green-50 rounded-lg p-4 space-y-2 border border-green-200">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Distance</span>
                  <span className="text-sm font-bold text-gray-900">{optimizedDistance?.toFixed(1)} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Stops</span>
                  <span className="text-sm font-bold text-gray-900">{currentStops}</span>
                </div>
              </div>

              {/* Savings */}
              <div className="mt-4 bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-900">Savings</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-2xl font-bold text-blue-600">{optimization.saved.toFixed(1)} km</span>
                  <span className="text-lg font-bold text-blue-600">{optimization.percent}% reduction</span>
                </div>
              </div>
            </div>
          )}

          {!optimization && (
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <p className="text-sm text-yellow-800">
                Optimization in progress... The route will be optimized using nearest-neighbor algorithm.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Keep Current
          </button>
          <button
            onClick={handleApply}
            disabled={isApplying || !optimization}
            className="flex-1 px-4 py-2 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
          >
            {isApplying ? 'Applying...' : 'Apply Optimization'}
          </button>
        </div>
      </div>
    </div>
  )
}
