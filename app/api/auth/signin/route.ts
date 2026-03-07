import { NextRequest, NextResponse } from 'next/server'
import { signIn } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password, tenant } = await req.json()

    if (!email || !password || !tenant) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const result = await signIn(email, password, tenant)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 401 })
    }

    const response = NextResponse.json({ user: result.user })
    response.cookies.set('fleetflow_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (err) {
    console.error('Sign in error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
