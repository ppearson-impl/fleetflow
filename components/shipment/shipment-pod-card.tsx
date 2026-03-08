'use client'

interface POD {
  id: string
  recipientName?: string | null
  signatureUrl?: string | null
  photoUrl?: string | null
  notes?: string | null
  deliveryTime: Date
}

interface ShipmentPodCardProps {
  pod: POD | null
}

export default function ShipmentPodCard({ pod }: ShipmentPodCardProps) {
  if (!pod) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm">
        <p className="text-yellow-700">
          <span className="font-semibold">No POD recorded yet.</span> Delivery in progress or pending.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Recipient info */}
      {pod.recipientName && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-600 mb-1">Received by</p>
          <p className="text-lg font-bold text-gray-900">{pod.recipientName}</p>
          <p className="text-xs text-gray-500 mt-2">
            {new Date(pod.deliveryTime).toLocaleDateString()} at{' '}
            {new Date(pod.deliveryTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      )}

      {/* Signature */}
      {pod.signatureUrl && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-600 mb-3">Signature</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pod.signatureUrl}
            alt="Delivery signature"
            className="w-full h-32 bg-gray-100 rounded-lg object-contain"
          />
        </div>
      )}

      {/* Photo */}
      {pod.photoUrl && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-600 mb-3">Proof of delivery photo</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pod.photoUrl}
            alt="Delivery photo"
            className="w-full h-48 bg-gray-100 rounded-lg object-cover"
          />
        </div>
      )}

      {/* Notes */}
      {pod.notes && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">Notes</p>
          <p className="text-sm text-gray-700">{pod.notes}</p>
        </div>
      )}
    </div>
  )
}
