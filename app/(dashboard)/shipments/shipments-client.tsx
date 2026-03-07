'use client'

import { useState, useRef } from 'react'
import { formatDate, formatDateTime, statusColor } from '@/lib/utils'
import Papa from 'papaparse'

const STATUSES = ['', 'PENDING', 'PLANNED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'CANCELLED']

interface Shipment {
  id: string
  origin: string
  destination: string
  status: string
  plannedDate: Date | null
  createdAt: Date
  order: { reference: string; customer: { name: string } }
  route: { driver: { name: string } | null } | null
  exceptions: Array<{ id: string }>
}

export function ShipmentsClient({
  data,
  userRole,
}: {
  data: { shipments: Shipment[]; customers: Array<{ id: string; name: string }> }
  userRole: string
}) {
  const { shipments, customers } = data
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [newForm, setNewForm] = useState({
    customerId: customers[0]?.id || '',
    reference: '',
    origin: '',
    destination: '',
    plannedDate: '',
  })
  const [saving, setSaving] = useState(false)

  const canEdit = ['ADMIN', 'PLANNER'].includes(userRole)

  const filtered = shipments.filter((s) => {
    const matchStatus = !statusFilter || s.status === statusFilter
    const q = filter.toLowerCase()
    const matchQ =
      !q ||
      s.order.reference.toLowerCase().includes(q) ||
      s.order.customer.name.toLowerCase().includes(q) ||
      s.origin.toLowerCase().includes(q) ||
      s.destination.toLowerCase().includes(q)
    return matchStatus && matchQ
  })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/shipments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newForm),
    })
    if (res.ok) {
      setShowNew(false)
      window.location.reload()
    }
    setSaving(false)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        const res = await fetch('/api/shipments/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: result.data }),
        })
        const data = await res.json()
        alert(`Imported ${data.created} shipments${data.errors?.length ? `. ${data.errors.length} errors.` : '.'}`)
        setImporting(false)
        window.location.reload()
      },
    })
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
          <p className="text-gray-500 text-sm">{shipments.length} total</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <label className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50">
              {importing ? 'Importing...' : 'Import CSV'}
              <input type="file" accept=".csv" ref={fileRef} onChange={handleImport} className="hidden" />
            </label>
            <button
              onClick={() => setShowNew(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              + New Shipment
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search reference, customer, location..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s || 'All statuses'}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Reference</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Customer</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Origin → Destination</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Driver</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Planned Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/shipments/${s.id}`}>
                <td className="px-4 py-3 font-mono text-blue-600">{s.order.reference}</td>
                <td className="px-4 py-3 text-gray-900">{s.order.customer.name}</td>
                <td className="px-4 py-3 text-gray-600 max-w-xs">
                  <span className="truncate block">{s.origin}</span>
                  <span className="truncate block text-gray-400">→ {s.destination}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusColor(s.status)}`}>
                    {s.status.replace(/_/g, ' ')}
                  </span>
                  {s.exceptions.length > 0 && (
                    <span className="ml-1 inline-flex px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700">!</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{s.route?.driver?.name || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(s.plannedDate)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">No shipments found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* New Shipment Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold mb-4">New Shipment</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                  <select
                    value={newForm.customerId}
                    onChange={(e) => setNewForm({ ...newForm, customerId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    required
                  >
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                  <input
                    type="text"
                    value={newForm.reference}
                    onChange={(e) => setNewForm({ ...newForm, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="ORD-001"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Origin</label>
                <input
                  type="text"
                  value={newForm.origin}
                  onChange={(e) => setNewForm({ ...newForm, origin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="123 Pickup St, London"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                <input
                  type="text"
                  value={newForm.destination}
                  onChange={(e) => setNewForm({ ...newForm, destination: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="456 Delivery Ave, Manchester"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Planned Date</label>
                <input
                  type="date"
                  value={newForm.plannedDate}
                  onChange={(e) => setNewForm({ ...newForm, plannedDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-60">
                  {saving ? 'Creating...' : 'Create Shipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
