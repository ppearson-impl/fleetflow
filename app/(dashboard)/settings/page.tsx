import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SettingsClient } from './settings-client'

async function getSettingsData(tenantId: string) {
  const [users, drivers, vehicles, locations] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId },
      select: { id: true, name: true, email: true, role: true, status: true },
      orderBy: { name: 'asc' },
    }),
    prisma.driver.findMany({ where: { tenantId }, orderBy: { name: 'asc' } }),
    prisma.vehicle.findMany({ where: { tenantId }, orderBy: { registration: 'asc' } }),
    prisma.location.findMany({ where: { tenantId }, orderBy: { name: 'asc' } }),
  ])
  return { users, drivers, vehicles, locations }
}

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) return null
  const data = await getSettingsData(session.tenantId)
  return <SettingsClient data={data} tenantId={session.tenantId} />
}
