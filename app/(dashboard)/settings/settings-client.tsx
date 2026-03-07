'use client'

import { useState } from 'react'
import { statusColor } from '@/lib/utils'

interface User { id: string; name: string; email: string; role: string; status: string }
interface Driver { id: string; name: string; phone?: string | null; email?: string | null; status: string; licenseType?: string | null }
interface Vehicle { id: string; registration: string; type?: string | null; capacityWeight?: number | null; status: string }
interface Location { id: string; name: string; address: string }

const TABS = ['Users', 'Drivers', 'Vehicles', 'Locations'] as const
type Tab = typeof TABS[number]

export function SettingsClient({
  data,
  tenantId,
}: {
  data: { users: User[]; drivers: Driver[]; vehicles: Vehicle[]; locations: Location[] }
  tenantId: string
}) {
  const [tab, setTab] = useState<Tab>('Users')
  const [users, setUsers] = useState(data.users)
  const [drivers, setDrivers] = useState(data.drivers)
  const [vehicles, setVehicles] = useState(data.vehicles)
  const [locations, setLocations] = useState(data.locations)

  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)

  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'PLANNER', password: 'password123' })
  const [driverForm, setDriverForm] = useState({ name: '', phone: '', email: '', licenseType: 'B' })
  const [vehicleForm, setVehicleForm] = useState({ registration: '', type: 'Van', capacityWeight: '1000' })
  const [locationForm, setLocationForm] = useState({ name: '', address: '' })

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userForm),
    })
    if (res.ok) {
      const u = await res.json()
      setUsers((prev) => [...prev, u])
      setShowNew(false)
    }
    setSaving(false)
  }

  async function createDriver(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/drivers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(driverForm),
    })
    if (res.ok) {
      const d = await res.json()
      setDrivers((prev) => [...prev, d])
      setShowNew(false)
    }
    setSaving(false)
  }

  async function createVehicle(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...vehicleForm, capacityWeight: parseFloat(vehicleForm.capacityWeight) }),
    })
    if (res.ok) {
      const v = await res.json()
      setVehicles((prev) => [...prev, v])
      setShowNew(false)
    }
    setSaving(false)
  }

  async function createLocation(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(locationForm),
    })
    if (res.ok) {
      const l = await res.json()
      setLocations((prev) => [...prev, l])
      setShowNew(false)
    }
    setSaving(false)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm">Manage your workspace</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Add {tab.slice(0, -1)}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {tab === 'Users' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor(u.role)}`}>{u.role}</span></td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor(u.status)}`}>{u.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Drivers tab */}
      {tab === 'Drivers' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Phone</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">License</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {drivers.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{d.name}</td>
                  <td className="px-4 py-3 text-gray-600">{d.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{d.licenseType || '—'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor(d.status)}`}>{d.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Vehicles tab */}
      {tab === 'Vehicles' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Registration</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Capacity (kg)</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {vehicles.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">{v.registration}</td>
                  <td className="px-4 py-3 text-gray-600">{v.type || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{v.capacityWeight?.toLocaleString() || '—'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor(v.status)}`}>{v.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Locations tab */}
      {tab === 'Locations' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Address</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Booking Link</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {locations.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{l.name}</td>
                  <td className="px-4 py-3 text-gray-600">{l.address}</td>
                  <td className="px-4 py-3">
                    <a href={`/appointments/book/${l.id}`} target="_blank" className="text-blue-600 hover:underline text-xs">
                      Open link →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Add {tab.slice(0, -1)}</h2>

            {tab === 'Users' && (
              <form onSubmit={createUser} className="space-y-3">
                <input type="text" placeholder="Full name" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
                <input type="email" placeholder="Email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
                <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                  {['ADMIN', 'PLANNER', 'OPERATIONS_MANAGER', 'DRIVER'].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <div className="flex gap-2 justify-end"><button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button><button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">{saving ? '...' : 'Create'}</button></div>
              </form>
            )}

            {tab === 'Drivers' && (
              <form onSubmit={createDriver} className="space-y-3">
                <input type="text" placeholder="Full name" value={driverForm.name} onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
                <input type="tel" placeholder="Phone" value={driverForm.phone} onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                <input type="email" placeholder="Email" value={driverForm.email} onChange={(e) => setDriverForm({ ...driverForm, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                <input type="text" placeholder="License type (B, C, CE...)" value={driverForm.licenseType} onChange={(e) => setDriverForm({ ...driverForm, licenseType: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                <div className="flex gap-2 justify-end"><button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button><button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">{saving ? '...' : 'Create'}</button></div>
              </form>
            )}

            {tab === 'Vehicles' && (
              <form onSubmit={createVehicle} className="space-y-3">
                <input type="text" placeholder="Registration (e.g. AB12 CDE)" value={vehicleForm.registration} onChange={(e) => setVehicleForm({ ...vehicleForm, registration: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
                <select value={vehicleForm.type} onChange={(e) => setVehicleForm({ ...vehicleForm, type: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                  {['Van', 'HGV', 'Rigid', 'Artic', 'Motorcycle'].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="number" placeholder="Capacity (kg)" value={vehicleForm.capacityWeight} onChange={(e) => setVehicleForm({ ...vehicleForm, capacityWeight: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                <div className="flex gap-2 justify-end"><button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button><button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">{saving ? '...' : 'Create'}</button></div>
              </form>
            )}

            {tab === 'Locations' && (
              <form onSubmit={createLocation} className="space-y-3">
                <input type="text" placeholder="Depot name" value={locationForm.name} onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
                <input type="text" placeholder="Full address" value={locationForm.address} onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
                <div className="flex gap-2 justify-end"><button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button><button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">{saving ? '...' : 'Create'}</button></div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
