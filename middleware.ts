import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api/auth', '/track']

// Pure Web Crypto JWT verification — zero external imports, fully Edge-compatible
async function verifySession(token: string) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    // Import the HMAC key using Web Crypto API (available in all Edge runtimes)
    const rawSecret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || 'fleetflow-secret-key-minimum-32-chars!!'
    )
    const key = await crypto.subtle.importKey(
      'raw',
      rawSecret,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    // Decode base64url signature
    const sigB64 = parts[2].replace(/-/g, '+').replace(/_/g, '/')
    const sigBytes = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0))

    // Verify signature over header.payload
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    )
    if (!valid) return null

    // Decode payload
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))

    // Check expiry
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null

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
