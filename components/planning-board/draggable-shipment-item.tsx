'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

interface ShipmentItemProps {
  id: string
  reference: string
  customer: string
  origin: string
  destination: string
  status: string
}

export function DraggableShipmentItem({
  id,
  reference,
  customer,
  origin,
  destination,
  status,
}: ShipmentItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `shipment-${id}`,
    data: { type: 'shipment', shipmentId: id },
  })

  const style = transform
    ? {
        transform: CSS.Transform.toString(transform),
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-3 bg-white border border-gray-200 rounded-lg cursor-grab active:cursor-grabbing hover:shadow-md transition ${
        isDragging ? 'bg-blue-50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-sm font-mono text-blue-600">{reference}</span>
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
          status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
          status === 'PLANNED' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {status}
        </span>
      </div>
      <p className="text-xs text-gray-600 font-medium">{customer}</p>
      <p className="text-xs text-gray-500 mt-1">
        {origin} → {destination}
      </p>
    </div>
  )
}
