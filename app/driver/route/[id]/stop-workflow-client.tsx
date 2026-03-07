'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { statusColor } from '@/lib/utils'

interface DeliveryItem { id: string; description: string; quantity: number }

interface Stop {
  id: string
  sequence: number
  location: string
  status: string
  lat: number | null
  lng: number | null
  timeWindowStart: Date | null
  timeWindowEnd: Date | null
  shipment: {
    id: string
    origin: string
    destination: string
    order: { reference: string; customer: { name: string; contactPhone?: string | null } }
    deliveryItems: DeliveryItem[]
    pod: { recipientName: string | null; signatureUrl: string | null } | null
  }
}

interface Route {
  id: string
  name: string | null
  driverId: string | null
  stops: Stop[]
}

export function StopWorkflowClient({
  route,
  activeStopId,
}: {
  route: Route
  activeStopId: string | null
}) {
  const router = useRouter()
  const [stops, setStops] = useState(route.stops)
  const [currentStopId, setCurrentStopId] = useState(activeStopId || route.stops.find((s) => s.status === 'PENDING')?.id || null)
  const [step, setStep] = useState<'detail' | 'arrived' | 'pod'>('detail')
  const [recipientName, setRecipientName] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const sigCanvas = useRef<HTMLCanvasElement>(null)
  const [signing, setSigning] = useState(false)
  const [signatureData, setSignatureData] = useState<string | null>(null)

  const currentStop = stops.find((s) => s.id === currentStopId)

  async function markArrived() {
    if (!currentStop) return
    setSaving(true)
    await fetch(`/api/stops/${currentStop.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ARRIVED' }),
    })
    setStops((prev) => prev.map((s) => s.id === currentStop.id ? { ...s, status: 'ARRIVED' } : s))
    setStep('arrived')
    setSaving(false)

    // GPS ping
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        fetch('/api/tracking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shipmentId: currentStop.shipment.id,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            driverId: route.driverId,
          }),
        })
      })
    }
  }

  async function completePOD(failed = false) {
    if (!currentStop) return
    setSaving(true)

    const status = failed ? 'FAILED' : 'DELIVERED'
    await fetch(`/api/stops/${currentStop.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })

    if (!failed) {
      await fetch('/api/pod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipmentId: currentStop.shipment.id,
          recipientName,
          signatureUrl: signatureData,
          notes,
        }),
      })
    }

    setStops((prev) => prev.map((s) => s.id === currentStop.id ? { ...s, status } : s))

    // Move to next stop
    const nextPending = stops.find((s) => s.status === 'PENDING' && s.id !== currentStopId)
    if (nextPending) {
      setCurrentStopId(nextPending.id)
      setStep('detail')
      setRecipientName('')
      setNotes('')
      setSignatureData(null)
    } else {
      // All done
      router.push('/driver')
    }

    setSaving(false)
  }

  function startSignature() {
    setSigning(true)
    const canvas = sigCanvas.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.strokeStyle = '#1e40af'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'

    let drawing = false
    let lastX = 0, lastY = 0

    function getPos(e: MouseEvent | TouchEvent) {
      const rect = canvas!.getBoundingClientRect()
      if ('touches' in e) {
        return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
      }
      return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top }
    }

    function onDown(e: MouseEvent | TouchEvent) {
      e.preventDefault()
      drawing = true
      const pos = getPos(e)
      lastX = pos.x; lastY = pos.y
    }
    function onMove(e: MouseEvent | TouchEvent) {
      if (!drawing) return
      e.preventDefault()
      const pos = getPos(e)
      ctx!.beginPath()
      ctx!.moveTo(lastX, lastY)
      ctx!.lineTo(pos.x, pos.y)
      ctx!.stroke()
      lastX = pos.x; lastY = pos.y
    }
    function onUp() {
      drawing = false
      setSignatureData(canvas!.toDataURL())
    }

    canvas.addEventListener('mousedown', onDown)
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseup', onUp)
    canvas.addEventListener('touchstart', onDown, { passive: false })
    canvas.addEventListener('touchmove', onMove, { passive: false })
    canvas.addEventListener('touchend', onUp)
  }

  if (!currentStop) {
    return (
      <div className="p-6 text-center">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Route Complete!</h2>
        <p className="text-gray-500 mb-6">All stops have been completed.</p>
        <a href="/driver" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium">Back to routes</a>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <a href="/driver" className="text-gray-400 hover:text-gray-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </a>
        <div className="flex-1">
          <div className="font-semibold text-gray-900">{route.name}</div>
          <div className="text-xs text-gray-500">
            Stop {currentStop.sequence} of {stops.length}
          </div>
        </div>
        <div className="flex gap-1">
          {stops.map((s) => (
            <button
              key={s.id}
              onClick={() => { setCurrentStopId(s.id); setStep('detail') }}
              className={`w-6 h-6 rounded-full text-xs font-bold transition ${
                s.id === currentStopId ? 'bg-blue-600 text-white' :
                s.status === 'DELIVERED' ? 'bg-green-500 text-white' :
                s.status === 'FAILED' ? 'bg-red-500 text-white' :
                'bg-gray-200 text-gray-600'
              }`}
            >
              {s.sequence}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stop detail */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{currentStop.shipment.order.customer.name}</h2>
              <p className="text-sm text-gray-500 font-mono">{currentStop.shipment.order.reference}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded font-medium ${statusColor(currentStop.status)}`}>
              {currentStop.status}
            </span>
          </div>

          <div className="flex items-start gap-2 mb-3 text-sm text-gray-700">
            <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <span>{currentStop.location}</span>
          </div>

          {currentStop.timeWindowStart && (
            <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3">
              Time window: {new Date(currentStop.timeWindowStart).toLocaleTimeString()} — {new Date(currentStop.timeWindowEnd!).toLocaleTimeString()}
            </div>
          )}

          {/* Items */}
          {currentStop.shipment.deliveryItems.length > 0 && (
            <div className="border border-gray-100 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-600 mb-2">Items to deliver:</p>
              {currentStop.shipment.deliveryItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-700">{item.description}</span>
                  <span className="font-medium">×{item.quantity}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {step === 'detail' && currentStop.status === 'PENDING' && (
          <button
            onClick={markArrived}
            disabled={saving}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl text-lg font-bold shadow-lg hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Updating...' : 'Mark Arrived'}
          </button>
        )}

        {(step === 'arrived' || currentStop.status === 'ARRIVED') && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <h3 className="font-semibold text-gray-900">Proof of Delivery</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Name</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Signature</label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden"
                  onClick={startSignature}
                >
                  <canvas
                    ref={sigCanvas}
                    width={340}
                    height={120}
                    className="w-full"
                    style={{ touchAction: 'none', cursor: 'crosshair', background: signatureData ? 'transparent' : '#f9fafb' }}
                  />
                  {!signatureData && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400 text-sm">
                      Tap to sign
                    </div>
                  )}
                </div>
                {signatureData && (
                  <button onClick={() => { setSignatureData(null); const c = sigCanvas.current; if (c) { const ctx = c.getContext('2d'); ctx?.clearRect(0, 0, c.width, c.height) } }} className="text-xs text-blue-600 mt-1">Clear signature</button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                  placeholder="Left with neighbour, etc."
                />
              </div>
            </div>

            <button
              onClick={() => completePOD(false)}
              disabled={saving || !recipientName}
              className="w-full py-4 bg-green-600 text-white rounded-2xl text-lg font-bold shadow-lg hover:bg-green-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Complete Delivery'}
            </button>

            <button
              onClick={() => completePOD(true)}
              disabled={saving}
              className="w-full py-3 bg-red-100 text-red-700 rounded-2xl font-medium hover:bg-red-200"
            >
              Mark as Failed
            </button>
          </div>
        )}

        {(currentStop.status === 'DELIVERED' || currentStop.status === 'FAILED') && (
          <div className={`p-4 rounded-2xl text-center font-semibold ${currentStop.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {currentStop.status === 'DELIVERED' ? '✓ Delivered' : '✗ Failed'}
          </div>
        )}
      </div>
    </div>
  )
}
