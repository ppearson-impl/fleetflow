import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { Sidebar } from '@/components/sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'DRIVER') redirect('/driver')

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar user={session} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
