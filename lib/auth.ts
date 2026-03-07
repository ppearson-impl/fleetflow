import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'fleetflow-secret-key-minimum-32-chars!!'
)

export interface SessionUser {
  id: string
  email: string
  name: string
  role: string
  tenantId: string
  tenantName: string
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export async function createToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as SessionUser
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('fleetflow_session')?.value
  if (!token) return null
  return verifyToken(token)
}

export async function getSessionFromRequest(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get('fleetflow_session')?.value
  if (!token) return null
  return verifyToken(token)
}

export async function signIn(email: string, password: string, tenantSlug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  if (!tenant) return { error: 'Tenant not found' }

  const user = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email } },
  })
  if (!user) return { error: 'Invalid credentials' }
  if (user.status !== 'ACTIVE') return { error: 'Account inactive' }

  const valid = await verifyPassword(password, user.password)
  if (!valid) return { error: 'Invalid credentials' }

  const sessionUser: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    tenantName: tenant.name,
  }

  const token = await createToken(sessionUser)
  return { user: sessionUser, token }
}
