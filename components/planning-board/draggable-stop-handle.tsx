'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

interface DraggableStopHandleProps {
  id: string
  routeId: string
  sequence: number
  location: string
  status: string
}

export function DraggableStopHandle({
  id,
  routeId,
  sequence,
  location,
  status,
}: DraggableStopHandleProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `stop-${routeId}-${id}`,
    data: { type: 'stop', stopId: id, routeId },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 rounded border transition ${
        isDragging
          ? 'bg-blue-100 border-blue-300'
          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
      }`}
    >
      <button
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
          status === 'DELIVERED' ? 'bg-green-600' :
          status === 'ARRIVED' ? 'bg-blue-600' :
          'bg-gray-400'
        }`}>
          {sequence}
        </span>
        <span className="text-xs text-gray-700 truncate">{location}</span>
      </div>
      <span className="flex-shrink-0 text-xs text-gray-500 font-medium">{status}</span>
    </div>
  )
}
