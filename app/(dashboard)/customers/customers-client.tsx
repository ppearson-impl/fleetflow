'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useToast } from '@/lib/toast-context'

interface Shipment {
  id: string
  status: string
}

interface Order {
  id: string
  reference: string
  status: string
  createdAt: Date
  shipments: Shipment[]
}

interface Customer {
  id: string
  name: string
  contactEmail?: string | null
  contactPhone?: string | null
  address?: string | null
  orders: Order[]
}

interface CustomersClientProps {
  customers: Customer[]
}

export default function CustomersClient({ customers: initialCustomers }: CustomersClientProps) {
  const [customers, setCustomers] = useState(initialCustomers)
  const [showNewForm, setShowNewForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', contactEmail: '', contactPhone: '', address: '' })
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) {
      toast.error('Customer name is required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error()

      const newCustomer = await res.json()
      setCustomers([...customers, { ...newCustomer, orders: [] }])
      setFormData({ name: '', contactEmail: '', contactPhone: '', address: '' })
      setShowNewForm(false)
      toast.success('Customer created successfully')
    } catch {
      toast.error('Failed to create customer')
    } finally {
      setSaving(false)
    }
  }

  const getDeliveryStats = (orders: Order[]) => {
    const totalShipments = orders.reduce((sum, o) => sum + o.shipments.length, 0)
    const delivered = orders.reduce(
      (sum, o) => sum + o.shipments.filter((s) => s.status === 'DELIVERED').length,
      0
    )
    const failed = orders.reduce(
      (sum, o) => sum + o.shipments.filter((s) => s.status === 'FAILED').length,
      0
    )
    return { totalShipments, delivered, failed }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
            <p className="text-gray-600 mt-2">{customers.length} customers in your account</p>
          </div>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
          >
            + New Customer
          </button>
        </div>

        {/* New Customer Form */}
        {showNewForm && (
          <div className="bg-white rounded-xl p-6 mb-8 shadow-sm border border-blue-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Add New Customer</h2>
            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Acme Corp"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="contact@company.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="+44 20 1234 5678"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="10 Baker Street, London"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Customer'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Customers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((customer) => {
            const stats = getDeliveryStats(customer.orders)
            const onTimePercent = stats.totalShipments > 0
              ? Math.round((stats.delivered / stats.totalShipments) * 100)
              : 0

            return (
              <div key={customer.id} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition">
                {/* Customer Header */}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900">{customer.name}</h3>
                  {customer.contactEmail && (
                    <p className="text-sm text-gray-600 break-all">{customer.contactEmail}</p>
                  )}
                  {customer.contactPhone && (
                    <p className="text-sm text-gray-600">{customer.contactPhone}</p>
                  )}
                  {customer.address && <p className="text-sm text-gray-500 mt-1">{customer.address}</p>}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{customer.orders.length}</div>
                    <div className="text-xs text-gray-600">Orders</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{stats.delivered}</div>
                    <div className="text-xs text-gray-600">Delivered</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">{stats.failed}</div>
                    <div className="text-xs text-gray-600">Failed</div>
                  </div>
                </div>

                {/* On-time rate */}
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">On-time Rate</span>
                    <span className="text-sm font-bold text-gray-900">{onTimePercent}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${onTimePercent}%` }}
                    />
                  </div>
                </div>

                {/* Recent Orders */}
                {customer.orders.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Recent Orders</h4>
                    <div className="space-y-2">
                      {customer.orders.slice(0, 3).map((order) => (
                        <div key={order.id} className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 font-mono">{order.reference}</span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              order.status === 'CONFIRMED'
                                ? 'bg-blue-100 text-blue-700'
                                : order.status === 'COMPLETED'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                      ))}
                      {customer.orders.length > 3 && (
                        <p className="text-xs text-gray-500 pt-1">
                          +{customer.orders.length - 3} more orders
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    href={`/shipments?customer=${customer.id}`}
                    className="flex-1 text-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                  >
                    View Shipments
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        {/* Empty State */}
        {customers.length === 0 && !showNewForm && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No customers yet. Create one to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}
