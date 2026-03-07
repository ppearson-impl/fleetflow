import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { StopWorkflowClient } from './stop-workflow-client'

export default async function DriverRoutePage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { stopId?: string }
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const route = await prisma.route.findUnique({
    where: { id: params.id },
    include: {
      driver: true,
      vehicle: true,
      stops: {
        orderBy: { sequence: 'asc' },
        include: {
          shipment: {
            include: {
              order: { include: { customer: true } },
              deliveryItems: true,
              pod: true,
            },
          },
        },
      },
    },
  })

  if (!route) redirect('/driver')

  const activeStop = searchParams.stopId
    ? route.stops.find((s) => s.id === searchParams.stopId)
    : route.stops.find((s) => s.status === 'PENDING')

  return <StopWorkflowClient route={route} activeStopId={activeStop?.id || null} />
}
