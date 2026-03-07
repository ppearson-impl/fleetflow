import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { LiveTrackingClient } from './live-tracking-client'

export default async function TrackingPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  return <LiveTrackingClient />
}
