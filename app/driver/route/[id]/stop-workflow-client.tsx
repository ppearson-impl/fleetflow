'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { statusColor } from '@/lib/utils'
import { useToast } from '@/lib/toast-context'

const StopMap = dynamic(() => import('@/components/driver/stop-map'), {
  ssr: false,
  loading: () => <div className="h-44 bg-gray-100 rounded-xl animate-pulse" />,
})

const FAIL_REASONS = [
  { value: 'NOT_HOME', label: 'Not home / no answer' },
  { value: 'ACCESS_ISSUE', label: 'Cannot access location' },
  { value: 'WRONG_ADDRESS', label: 'Wrong address' },
  { value: 'REFUSED', label: 'Customer refused delivery' },
  { value: 'DAMAGED_GOODS', label: 'Goods damaged in transit' },
]

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
  const toast = useToast()

  const [stops, setStops] = useState(route.stops)
  const [currentStopId, setCurrentStopId] = useState(
    activeStopId || route.stops.find((s) => s.status === 'PENDING')?.id || null
  )
  const [step, setStep] = useState<'detail' | 'arrived' | 'pod'>('detail')
  const [recipientName, setRecipientName] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const sigCanvas = useRef<HTMLCanvasElement>(null)
  const [signatureData, setSignatureData] = useState<string | null>(null)

  // Photo capture
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [photoData, setPhotoData] = useState<string | null>(null)

  // Failure reason modal
  const [showFailModal, setShowFailModal] = useState(false)
  const [failureReason, setFailureReason] = useState('NOT_HOME')

  // Driver GPS position (for map)
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setDriverPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // silently ignore if denied
      )
    }
  }, [])

  const currentStop = stops.find((s) => s.id === currentStopId)

  async function markArrived() {
    if (!currentStop) return
    setSaving(true)
    try {
      const res = await fetch(`/api/stops/${currentStop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ARRIVED' }),
      })
      if (!res.ok) throw new Error()
      setStops((prev) => prev.map((s) => s.id === currentStop.id ? { ...s, status: 'ARRIVED' } : s))
      setStep('arrived')
      toast.success('Arrived — complete the POD when ready')

      // GPS ping
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          setDriverPos({ lat: pos.coords.latitude, lng: pos.coords.longitude })
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
    } catch {
      toast.error('Failed to update — check your connection')
    } finally {
      setSaving(false)
    }
  }

  async function completePOD(failed = false, reason?: string) {
    if (!currentStop) return
    setSaving(true)
    try {
      const status = failed ? 'FAILED' : 'DELIVERED'
      const stopRes = await fetch(`/api/stops/${currentStop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          ...(failed && reason ? { failureReason: reason } : {}),
        }),
      })
      if (!stopRes.ok) throw new Error()

      if (!failed) {
        const podRes = await fetch('/api/pod', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shipmentId: currentStop.shipment.id,
            recipientName,
            signatureUrl: signatureData,
            photoUrl: photoData,
            notes,
          }),
        })
        if (!podRes.ok) throw new Error()
        toast.success('Delivery complete — POD saved ✓')
      } else {
        toast.success('Stop marked as failed')
      }

      setStops((prev) => prev.map((s) => s.id === currentStop.id ? { ...s, status } : s))

      const nextPending = stops.find((s) => s.status === 'PENDING' && s.id !== currentStopId)
      if (nextPending) {
        setCurrentStopId(nextPending.id)
        setStep('detail')
        setRecipientName('')
        setNotes('')
        setSignatureData(null)
        setPhotoData(null)
      } else {
        router.push('/driver')
      }
    } catch {
      toast.error('Failed to save — check your connection')
    } finally {
      setSaving(false)
    }
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoData(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function startSignature() {
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
      e.preventDefault(); drawing = true
      const pos = getPos(e); lastX = pos.x; lastY = pos.y
    }
    function onMove(e: MouseEvent | TouchEvent) {
      if (!drawing) return; e.preventDefault()
      const pos = getPos(e)
      ctx!.beginPath(); ctx!.moveTo(lastX, lastY); ctx!.lineTo(pos.x, pos.y); ctx!.stroke()
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
          <div className="text-xs text-gray-500">Stop {currentStop.sequence} of {stops.length}</div>
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
        {/* Stop detail card */}
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
            <span className="flex-1">{currentStop.location}</span>
            {currentStop.lat && currentStop.lng && (
              <a
                href={`https://maps.google.com/maps?daddr=${currentStop.lat},${currentStop.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100"
              >
                Navigate →
              </a>
            )}
          </div>

          {/* Phone link */}
          {currentStop.shipment.order.customer.contactPhone && (
            <a
              href={`tel:${currentStop.shipment.order.customer.contactPhone}`}
              className="flex items-center gap-2 text-sm text-blue-600 mb-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {currentStop.shipment.order.customer.contactPhone}
            </a>
          )}

          {currentStop.timeWindowStart && (
            <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3">
              ⏰ Time window: {new Date(currentStop.timeWindowStart).toLocaleTimeString()} — {new Date(currentStop.timeWindowEnd!).toLocaleTimeString()}
            </div>
          )}

          {/* Delivery items */}
          {currentStop.shipment.deliveryItems.length > 0 && (
            <div className="border border-gray-100 rounded-lg p-3 mb-3">
              <p className="text-xs font-medium text-gray-600 mb-2">Items to deliver:</p>
              {currentStop.shipment.deliveryItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-700">{item.description}</span>
                  <span className="font-medium">×{item.quantity}</span>
                </div>
              ))}
            </div>
          )}

          {/* Map — only shown when stop has coordinates and not yet arrived */}
          {currentStop.lat && currentStop.lng && step === 'detail' && currentStop.status === 'PENDING' && (
            <StopMap
              stopLat={currentStop.lat}
              stopLng={currentStop.lng}
              driverLat={driverPos?.lat}
              driverLng={driverPos?.lng}
            />
          )}
        </div>

        {/* ── Step actions ── */}

        {step === 'detail' && currentStop.status === 'PENDING' && (
          <button
            onClick={markArrived}
            disabled={saving}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl text-lg font-bold shadow-lg hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Updating...' : '📍 Mark Arrived'}
          </button>
        )}

        {(step === 'arrived' || currentStop.status === 'ARRIVED') && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
              <h3 className="font-semibold text-gray-900">Proof of Delivery</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Name *</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Full name of recipient"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                />
              </div>

              {/* Signature */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Signature</label>
                <div className="relative border-2 border-dashed border-gray-300 rounded-xl overflow-hidden" onClick={startSignature}>
                  <canvas
                    ref={sigCanvas}
                    width={340}
                    height={120}
                    className="w-full"
                    style={{ touchAction: 'none', cursor: 'crosshair', background: '#f9fafb' }}
                  />
                  {!signatureData && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400 text-sm">
                      ✏️ Tap to sign
                    </div>
                  )}
                </div>
                {signatureData && (
                  <button
                    onClick={() => {
                      setSignatureData(null)
                      const c = sigCanvas.current
                      if (c) c.getContext('2d')?.clearRect(0, 0, c.width, c.height)
                    }}
                    className="text-xs text-blue-600 mt-1"
                  >
                    Clear signature
                  </button>
                )}
              </div>

              {/* Photo capture */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photo (optional)</label>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                {photoData ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoData} alt="POD photo" className="w-full h-32 object-cover rounded-xl" />
                    <button
                      onClick={() => setPhotoData(null)}
                      className="absolute top-2 right-2 bg-white rounded-full p-1 shadow text-xs text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition"
                  >
                    📷 Take photo
                  </button>
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
              {saving ? 'Saving...' : '✓ Complete Delivery'}
            </button>

            <button
              onClick={() => setShowFailModal(true)}
              disabled={saving}
              className="w-full py-3 bg-red-50 text-red-700 rounded-2xl font-medium hover:bg-red-100 border border-red-200"
            >
              ✗ Can&apos;t Deliver
            </button>
          </div>
        )}

        {(currentStop.status === 'DELIVERED' || currentStop.status === 'FAILED') && (
          <div className={`p-4 rounded-2xl text-center font-semibold ${
            currentStop.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {currentStop.status === 'DELIVERED' ? '✓ Delivered' : '✗ Failed'}
          </div>
        )}
      </div>

      {/* Failure reason modal */}
      {showFailModal && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-end" onClick={() => setShowFailModal(false)}>
          <div
            className="bg-white rounded-t-2xl w-full max-w-sm mx-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900">Why can&apos;t you deliver?</h3>
            <div className="space-y-2">
              {FAIL_REASONS.map((r) => (
                <label key={r.value} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="failReason"
                    value={r.value}
                    checked={failureReason === r.value}
                    onChange={() => setFailureReason(r.value)}
                    className="accent-red-600"
                  />
                  <span className="text-sm text-gray-800">{r.label}</span>
                </label>
              ))}
            </div>
            <button
              onClick={() => {
                setShowFailModal(false)
                completePOD(true, failureReason)
              }}
              disabled={saving}
              className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-60"
            >
              Confirm Failure
            </button>
            <button
              onClick={() => setShowFailModal(false)}
              className="w-full py-2 text-gray-500 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
