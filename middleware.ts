import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = ['/login', '/api/auth', '/track']

// Inline verification — avoids importing lib/auth which pulls in Prisma (not Edge-compatible)
async function verifySession(token: string) {
  try {
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || 'fleetflow-secret-key-minimum-32-chars!!'
    )
    const { payload } = await jwtVerify(token, secret)
    return payload as { id: string; email: string; role: string; tenantId: string; tenantName: string }
  } catch {
    return null
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = req.cookies.get('fleetflow_session')?.value
  if (!token) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const user = await verifySession(token)
  if (!user) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  // Role-based access
  if (pathname.startsWith('/driver') && user.role !== 'DRIVER' && user.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  if (pathname.startsWith('/settings') && user.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Attach user info to headers for server components
  const response = NextResponse.next()
  response.headers.set('x-user-id', user.id)
  response.headers.set('x-tenant-id', user.tenantId)
  response.headers.set('x-user-role', user.role)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)'],
}
