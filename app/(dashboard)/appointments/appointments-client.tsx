'use client'

import { useState } from 'react'
import { formatDateTime, statusColor } from '@/lib/utils'

interface Location { id: string; name: string; address: string }
interface Appointment {
  id: string
  companyName: string
  contactName: string | null
  contactEmail: string | null
  startTime: Date
  endTime: Date
  status: string
  notes: string | null
  location: Location
}

export function AppointmentsClient({
  data,
  tenantId,
}: {
  data: { appointments: Appointment[]; locations: Location[] }
  tenantId: string
}) {
  const [appointments, setAppointments] = useState(data.appointments)
  const [locations] = useState(data.locations)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    locationId: locations[0]?.id || '',
    companyName: '',
    contactName: '',
    contactEmail: '',
    startTime: '',
    endTime: '',
    notes: '',
  })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, tenantId }),
    })
    if (res.ok) {
      const apt = await res.json()
      setAppointments((prev) => [apt, ...prev])
      setShowNew(false)
      setForm({ locationId: locations[0]?.id || '', companyName: '', contactName: '', contactEmail: '', startTime: '', endTime: '', notes: '' })
    }
    setSaving(false)
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status } : a))
  }

  const today = appointments.filter((a) => {
    const d = new Date(a.startTime)
    const now = new Date()
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth()
  })
  const upcoming = appointments.filter((a) => new Date(a.startTime) > new Date())

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-500 text-sm">{appointments.length} total · {today.length} today</p>
        </div>
        <div className="flex gap-2">
          {locations.length > 0 && (
            <a
              href={`/appointments/book/${locations[0].id}`}
              target="_blank"
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Partner Booking Link
            </a>
          )}
          <button
            onClick={() => setShowNew(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + New Appointment
          </button>
        </div>
      </div>

      {/* Today */}
      {today.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Today</h2>
          <div className="space-y-2">
            {today.map((apt) => (
              <AppointmentCard key={apt.id} apt={apt} onUpdateStatus={updateStatus} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming */}
      <section>
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Upcoming</h2>
        <div className="space-y-2">
          {upcoming.map((apt) => (
            <AppointmentCard key={apt.id} apt={apt} onUpdateStatus={updateStatus} />
          ))}
          {upcoming.length === 0 && (
            <div className="text-gray-400 text-sm py-4">No upcoming appointments</div>
          )}
        </div>
      </section>

      {/* Locations */}
      {locations.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          No depot locations configured. Add locations in Settings to enable appointment booking.
        </div>
      )}

      {/* New modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold mb-4">New Appointment</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <select
                  value={form.locationId}
                  onChange={(e) => setForm({ ...form, locationId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  required
                >
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <input
                    type="text"
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
                  <input
                    type="text"
                    value={form.contactName}
                    onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-60">
                  {saving ? 'Saving...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function AppointmentCard({
  apt,
  onUpdateStatus,
}: {
  apt: Appointment
  onUpdateStatus: (id: string, status: string) => void
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-4">
      <div className="text-center min-w-16">
        <div className="text-xs text-gray-500">
          {new Date(apt.startTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
        </div>
        <div className="text-sm font-bold text-gray-900">
          {new Date(apt.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="text-xs text-gray-400">
          — {new Date(apt.endTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900">{apt.companyName}</div>
        {apt.contactName && <div className="text-sm text-gray-600">{apt.contactName}</div>}
        <div className="text-sm text-gray-500">{apt.location.name}</div>
        {apt.notes && <div className="text-xs text-gray-400 mt-1">{apt.notes}</div>}
      </div>
      <div className="flex flex-col items-end gap-2">
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColor(apt.status)}`}>{apt.status}</span>
        {apt.status === 'PENDING' && (
          <button
            onClick={() => onUpdateStatus(apt.id, 'CONFIRMED')}
            className="text-xs text-green-600 hover:underline"
          >
            Confirm
          </button>
        )}
      </div>
    </div>
  )
}
