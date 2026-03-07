import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppointmentsClient } from './appointments-client'

async function getAppointments(tenantId: string) {
  const [appointments, locations] = await Promise.all([
    prisma.appointment.findMany({
      where: { tenantId },
      include: { location: true },
      orderBy: { startTime: 'asc' },
    }),
    prisma.location.findMany({ where: { tenantId }, orderBy: { name: 'asc' } }),
  ])
  return { appointments, locations }
}

export default async function AppointmentsPage() {
  const session = await getSession()
  if (!session) return null
  const data = await getAppointments(session.tenantId)
  return <AppointmentsClient data={data} tenantId={session.tenantId} />
}
