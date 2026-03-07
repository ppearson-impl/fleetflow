import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest, hashPassword } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const users = await prisma.user.findMany({
    where: { tenantId: session.tenantId },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, email, role, password } = await req.json()

  const hashed = await hashPassword(password || 'password123')

  const user = await prisma.user.create({
    data: {
      tenantId: session.tenantId,
      name,
      email,
      role,
      password: hashed,
      status: 'ACTIVE',
    },
    select: { id: true, name: true, email: true, role: true, status: true },
  })

  return NextResponse.json(user, { status: 201 })
}
