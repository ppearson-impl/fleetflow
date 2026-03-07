'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

interface Location {
  id: string
  name: string
  address: string
  tenantId: string
}

// Generate time slots: every hour from 7am to 5pm
function generateSlots(date: string): { start: string; end: string; label: string }[] {
  const slots = []
  for (let h = 7; h < 17; h++) {
    const startH = h.toString().padStart(2, '0')
    const endH = (h + 1).toString().padStart(2, '0')
    slots.push({
      start: `${date}T${startH}:00`,
      end: `${date}T${endH}:00`,
      label: `${startH}:00 – ${endH}:00`,
    })
  }
  return slots
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function BookingPortalPage() {
  const params = useParams()
  const locationId = params.locationId as string

  const [location, setLocation] = useState<Location | null>(null)
  const [date, setDate] = useState(today())
  const [slots, setSlots] = useState(generateSlots(today()))
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string; label: string } | null>(null)
  const [form, setForm] = useState({ companyName: '', contactName: '', contactEmail: '', notes: '' })
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/locations/${locationId}`)
      .then((r) => r.json())
      .then(setLocation)
      .catch(() => {})
  }, [locationId])

  function handleDateChange(d: string) {
    setDate(d)
    setSlots(generateSlots(d))
    setSelectedSlot(null)
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSlot || !location) return
    setSaving(true)
    setError('')

    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationId,
        tenantId: location.tenantId,
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        ...form,
      }),
    })

    if (res.ok) {
      setSaved(true)
    } else {
      const data = await res.json()
      setError(data.error || 'Booking failed. Please try another slot.')
    }
    setSaving(false)
  }

  if (saved) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-500">Your appointment has been submitted and is pending confirmation. You will receive a confirmation shortly.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow p-6 mb-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Book an Appointment</h1>
              {location && <p className="text-sm text-gray-500">{location.name} · {location.address}</p>}
            </div>
          </div>

          {/* Date picker */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
            <input
              type="date"
              value={date}
              min={today()}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
            />
          </div>

          {/* Time slots */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Time Slot</label>
            <div className="grid grid-cols-2 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.start}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`py-2 px-3 rounded-xl text-sm font-medium transition border ${
                    selectedSlot?.start === slot.start
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          </div>

          {selectedSlot && (
            <form onSubmit={handleBook} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                />
              </div>

              {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? 'Booking...' : `Book ${selectedSlot.label}`}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
