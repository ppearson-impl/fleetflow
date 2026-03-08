'use client'

import { useState } from 'react'
import { formatDateTime } from '@/lib/utils'
import { AlertCircle, CheckCircle, Clock } from 'lucide-react'

interface ExceptionCardProps {
  id: string
  type: string
  description: string
  status: string
  createdAt: Date
  shipmentRef: string
  shipmentRoute: string
  onStatusChange?: (newStatus: string) => void
}

export function ExceptionCard({
  id,
  type,
  description,
  status,
  createdAt,
  shipmentRef,
  shipmentRoute,
  onStatusChange,
}: ExceptionCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const statusColor = {
    OPEN: 'bg-red-100 text-red-800',
    ACKNOWLEDGED: 'bg-yellow-100 text-yellow-800',
    RESOLVED: 'bg-green-100 text-green-800',
  }[status] || 'bg-gray-100 text-gray-800'

  const statusIcon =
    status === 'RESOLVED' ? (
      <CheckCircle className="w-4 h-4" />
    ) : status === 'ACKNOWLEDGED' ? (
      <Clock className="w-4 h-4" />
    ) : (
      <AlertCircle className="w-4 h-4" />
    )

  async function handleStatusChange(newStatus: string) {
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/exceptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        onStatusChange?.(newStatus)
      }
    } catch (error) {
      console.error('Failed to update exception:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className={`p-4 rounded-lg border ${
      status === 'RESOLVED' ? 'opacity-60 border-gray-200 bg-gray-50' : 'border-red-200 bg-white'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {statusIcon}
          <span className={`text-xs px-2 py-1 rounded font-semibold ${statusColor}`}>
            {type.replace(/_/g, ' ')}
          </span>
        </div>
        <span className="text-xs text-gray-500">{formatDateTime(createdAt)}</span>
      </div>

      {/* Description */}
      <div className="mb-3">
        <p className="text-sm font-medium text-gray-900">{description}</p>
        <p className="text-xs text-gray-600 mt-1">
          {shipmentRef} → {shipmentRoute}
        </p>
      </div>

      {/* Actions */}
      {status === 'OPEN' && (
        <div className="flex gap-2">
          <button
            onClick={() => handleStatusChange('ACKNOWLEDGED')}
            disabled={isUpdating}
            className="flex-1 text-xs font-medium px-2 py-1.5 rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200 disabled:opacity-50 transition"
          >
            {isUpdating ? '...' : 'Acknowledge'}
          </button>
          <button
            onClick={() => handleStatusChange('RESOLVED')}
            disabled={isUpdating}
            className="flex-1 text-xs font-medium px-2 py-1.5 rounded bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50 transition"
          >
            {isUpdating ? '...' : 'Resolve'}
          </button>
        </div>
      )}

      {status === 'ACKNOWLEDGED' && (
        <button
          onClick={() => handleStatusChange('RESOLVED')}
          disabled={isUpdating}
          className="w-full text-xs font-medium px-2 py-1.5 rounded bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50 transition"
        >
          {isUpdating ? '...' : 'Resolve'}
        </button>
      )}

      {status === 'RESOLVED' && (
        <div className="text-xs text-green-600 font-medium">✓ Resolved</div>
      )}
    </div>
  )
}
