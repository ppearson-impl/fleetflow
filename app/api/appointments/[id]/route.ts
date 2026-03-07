import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const appointment = await prisma.appointment.update({
    where: { id: params.id },
    data: body,
    include: { location: true },
  })
  return NextResponse.json(appointment)
}
