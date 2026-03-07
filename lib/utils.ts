import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PLANNED: 'bg-blue-100 text-blue-800',
    DISPATCHED: 'bg-indigo-100 text-indigo-800',
    IN_TRANSIT: 'bg-purple-100 text-purple-800',
    DELIVERED: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-600',
    OPEN: 'bg-red-100 text-red-800',
    RESOLVED: 'bg-green-100 text-green-800',
    CONFIRMED: 'bg-green-100 text-green-800',
    DRAFT: 'bg-gray-100 text-gray-600',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    AVAILABLE: 'bg-green-100 text-green-800',
    ON_ROUTE: 'bg-blue-100 text-blue-800',
    OFFLINE: 'bg-gray-100 text-gray-600',
  }
  return map[status] || 'bg-gray-100 text-gray-600'
}
