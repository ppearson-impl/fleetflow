import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const location = await prisma.location.findUnique({ where: { id: params.id } })
  if (!location) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(location)
}
