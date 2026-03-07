import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { shipmentId, recipientName, signatureUrl, photoUrl, notes } = body

  if (!shipmentId) {
    return NextResponse.json({ error: 'shipmentId required' }, { status: 400 })
  }

  const pod = await prisma.pOD.upsert({
    where: { shipmentId },
    create: {
      shipmentId,
      recipientName,
      signatureUrl,
      photoUrl,
      notes,
      deliveryTime: new Date(),
    },
    update: {
      recipientName,
      signatureUrl,
      photoUrl,
      notes,
    },
  })

  await prisma.shipmentEvent.create({
    data: {
      shipmentId,
      eventType: 'POD_CAPTURED',
      description: `Delivered to ${recipientName}`,
      actor: 'driver',
    },
  })

  return NextResponse.json(pod, { status: 201 })
}
