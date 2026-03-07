import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding FleetFlow demo data...')

  // Create demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Demo Logistics Ltd',
      slug: 'demo',
      planType: 'PROFESSIONAL',
    },
  })

  console.log('Created tenant:', tenant.slug)

  // Hash password
  const password = await bcrypt.hash('password123', 12)

  // Create users
  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@fleetflow.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Alex Admin',
      email: 'admin@fleetflow.com',
      role: 'ADMIN',
      status: 'ACTIVE',
      password,
    },
  })

  const planner = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'planner@fleetflow.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Pat Planner',
      email: 'planner@fleetflow.com',
      role: 'PLANNER',
      status: 'ACTIVE',
      password,
    },
  })

  const driverUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'driver@fleetflow.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Dave Driver',
      email: 'driver@fleetflow.com',
      role: 'DRIVER',
      status: 'ACTIVE',
      password,
    },
  })

  console.log('Created users')

  // Customers
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { id: 'cust-acme' },
      update: {},
      create: {
        id: 'cust-acme',
        tenantId: tenant.id,
        name: 'Acme Corp',
        contactEmail: 'orders@acme.com',
        contactPhone: '+44 20 1234 5678',
        address: '10 Baker Street, London',
      },
    }),
    prisma.customer.upsert({
      where: { id: 'cust-globex' },
      update: {},
      create: {
        id: 'cust-globex',
        tenantId: tenant.id,
        name: 'Globex Industries',
        contactEmail: 'logistics@globex.com',
        contactPhone: '+44 161 234 5678',
        address: '25 Deansgate, Manchester',
      },
    }),
    prisma.customer.upsert({
      where: { id: 'cust-initech' },
      update: {},
      create: {
        id: 'cust-initech',
        tenantId: tenant.id,
        name: 'Initech Solutions',
        contactEmail: 'supply@initech.com',
        address: '5 Park Row, Leeds',
      },
    }),
  ])

  console.log('Created customers')

  // Drivers
  const driver1 = await prisma.driver.upsert({
    where: { id: 'driver-dave' },
    update: {},
    create: {
      id: 'driver-dave',
      tenantId: tenant.id,
      name: 'Dave Driver',
      phone: '+44 7700 900100',
      email: 'driver@fleetflow.com',
      licenseType: 'CE',
      status: 'AVAILABLE',
    },
  })

  const driver2 = await prisma.driver.upsert({
    where: { id: 'driver-sarah' },
    update: {},
    create: {
      id: 'driver-sarah',
      tenantId: tenant.id,
      name: 'Sarah Swift',
      phone: '+44 7700 900200',
      email: 'sarah@fleetflow.com',
      licenseType: 'C',
      status: 'AVAILABLE',
    },
  })

  // Vehicles
  const van1 = await prisma.vehicle.upsert({
    where: { tenantId_registration: { tenantId: tenant.id, registration: 'AB12 CDE' } },
    update: {},
    create: {
      tenantId: tenant.id,
      registration: 'AB12 CDE',
      type: 'Van',
      capacityWeight: 1000,
      capacityVolume: 10,
      status: 'AVAILABLE',
    },
  })

  const hgv1 = await prisma.vehicle.upsert({
    where: { tenantId_registration: { tenantId: tenant.id, registration: 'XY21 FGH' } },
    update: {},
    create: {
      tenantId: tenant.id,
      registration: 'XY21 FGH',
      type: 'HGV',
      capacityWeight: 10000,
      capacityVolume: 80,
      status: 'AVAILABLE',
    },
  })

  console.log('Created drivers and vehicles')

  // Depot location
  const depot = await prisma.location.upsert({
    where: { id: 'loc-london-depot' },
    update: {},
    create: {
      id: 'loc-london-depot',
      tenantId: tenant.id,
      name: 'London Depot',
      address: 'Unit 5, Logistics Park, Dartford DA1 1AA',
      lat: 51.4469,
      lng: 0.2074,
    },
  })

  // Orders and shipments
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  const order1 = await prisma.order.upsert({
    where: { tenantId_reference: { tenantId: tenant.id, reference: 'ORD-2025-001' } },
    update: {},
    create: {
      tenantId: tenant.id,
      customerId: customers[0].id,
      reference: 'ORD-2025-001',
      status: 'CONFIRMED',
    },
  })

  const order2 = await prisma.order.upsert({
    where: { tenantId_reference: { tenantId: tenant.id, reference: 'ORD-2025-002' } },
    update: {},
    create: {
      tenantId: tenant.id,
      customerId: customers[1].id,
      reference: 'ORD-2025-002',
      status: 'CONFIRMED',
    },
  })

  const order3 = await prisma.order.upsert({
    where: { tenantId_reference: { tenantId: tenant.id, reference: 'ORD-2025-003' } },
    update: {},
    create: {
      tenantId: tenant.id,
      customerId: customers[2].id,
      reference: 'ORD-2025-003',
      status: 'CONFIRMED',
    },
  })

  // Shipments (some delivered, some pending, some in transit)
  const shipment1 = await prisma.shipment.upsert({
    where: { id: 'ship-001' },
    update: {},
    create: {
      id: 'ship-001',
      orderId: order1.id,
      origin: 'London Depot, Dartford DA1 1AA',
      originLat: 51.4469,
      originLng: 0.2074,
      destination: '10 Baker Street, London W1U 6TJ',
      destLat: 51.5237,
      destLng: -0.1573,
      status: 'DELIVERED',
      plannedDate: new Date(),
    },
  })

  const shipment2 = await prisma.shipment.upsert({
    where: { id: 'ship-002' },
    update: {},
    create: {
      id: 'ship-002',
      orderId: order2.id,
      origin: 'London Depot, Dartford DA1 1AA',
      originLat: 51.4469,
      originLng: 0.2074,
      destination: '25 Deansgate, Manchester M3 4LQ',
      destLat: 53.4808,
      destLng: -2.2426,
      status: 'IN_TRANSIT',
      plannedDate: new Date(),
    },
  })

  const shipment3 = await prisma.shipment.upsert({
    where: { id: 'ship-003' },
    update: {},
    create: {
      id: 'ship-003',
      orderId: order3.id,
      origin: 'London Depot, Dartford DA1 1AA',
      originLat: 51.4469,
      originLng: 0.2074,
      destination: '5 Park Row, Leeds LS1 5HD',
      destLat: 53.7997,
      destLng: -1.5492,
      status: 'PENDING',
      plannedDate: tomorrow,
    },
  })

  // More shipments for dashboard data
  for (let i = 4; i <= 12; i++) {
    const statuses = ['DELIVERED', 'DELIVERED', 'DELIVERED', 'IN_TRANSIT', 'PENDING', 'PLANNED']
    const status = statuses[i % statuses.length] as 'DELIVERED' | 'IN_TRANSIT' | 'PENDING' | 'PLANNED'
    const cust = customers[i % customers.length]
    const daysAgo = new Date()
    daysAgo.setDate(daysAgo.getDate() - (i % 7))

    const ord = await prisma.order.create({
      data: {
        tenantId: tenant.id,
        customerId: cust.id,
        reference: `ORD-2025-${String(i).padStart(3, '0')}`,
        status: 'CONFIRMED',
      },
    })

    await prisma.shipment.create({
      data: {
        orderId: ord.id,
        origin: 'London Depot, Dartford',
        originLat: 51.4469,
        originLng: 0.2074,
        destination: `${i * 10} Test Street, City`,
        destLat: 51.5 + (Math.random() - 0.5) * 2,
        destLng: -0.1 + (Math.random() - 0.5) * 4,
        status,
        plannedDate: daysAgo,
        updatedAt: daysAgo,
      },
    })
  }

  // Active route for driver
  const route1 = await prisma.route.upsert({
    where: { id: 'route-001' },
    update: {},
    create: {
      id: 'route-001',
      tenantId: tenant.id,
      driverId: driver1.id,
      vehicleId: van1.id,
      name: 'London Morning Run',
      plannedStart: new Date(),
      status: 'DISPATCHED',
      distanceKm: 45.2,
      estimatedDuration: 180,
    },
  })

  // Stops for route
  await prisma.stop.upsert({
    where: { id: 'stop-001' },
    update: {},
    create: {
      id: 'stop-001',
      routeId: route1.id,
      shipmentId: shipment1.id,
      sequence: 1,
      location: '10 Baker Street, London W1U 6TJ',
      lat: 51.5237,
      lng: -0.1573,
      status: 'DELIVERED',
    },
  })

  await prisma.stop.upsert({
    where: { id: 'stop-002' },
    update: {},
    create: {
      id: 'stop-002',
      routeId: route1.id,
      shipmentId: shipment2.id,
      sequence: 2,
      location: '25 Deansgate, Manchester',
      lat: 53.4808,
      lng: -2.2426,
      status: 'PENDING',
    },
  })

  // Link shipments to route
  await prisma.shipment.updateMany({
    where: { id: { in: ['ship-001', 'ship-002'] } },
    data: { routeId: route1.id },
  })

  // Shipment events for timeline
  await prisma.shipmentEvent.createMany({
    skipDuplicates: true,
    data: [
      { shipmentId: 'ship-001', eventType: 'CREATED', description: 'Shipment created', actor: 'Pat Planner', timestamp: new Date(Date.now() - 3600000 * 5) },
      { shipmentId: 'ship-001', eventType: 'PLANNED', description: 'Added to route', actor: 'Pat Planner', timestamp: new Date(Date.now() - 3600000 * 4) },
      { shipmentId: 'ship-001', eventType: 'DISPATCHED', description: 'Driver dispatched', actor: 'Pat Planner', timestamp: new Date(Date.now() - 3600000 * 3) },
      { shipmentId: 'ship-001', eventType: 'ARRIVED', description: 'Driver arrived', actor: 'Dave Driver', timestamp: new Date(Date.now() - 3600000 * 1) },
      { shipmentId: 'ship-001', eventType: 'DELIVERED', description: 'Delivered successfully', actor: 'Dave Driver', timestamp: new Date(Date.now() - 1800000) },
    ],
  })

  // POD for delivered shipment
  await prisma.pOD.upsert({
    where: { shipmentId: 'ship-001' },
    update: {},
    create: {
      shipmentId: 'ship-001',
      recipientName: 'John Smith',
      notes: 'Left at reception',
      deliveryTime: new Date(Date.now() - 1800000),
    },
  })

  // GPS tracking events for in-transit shipment
  await prisma.shipmentEvent.createMany({
    skipDuplicates: true,
    data: [
      { shipmentId: 'ship-002', eventType: 'GPS_PING', lat: 51.8, lng: -1.2, actor: driver1.id, timestamp: new Date(Date.now() - 1800000), metadata: { lat: 51.8, lng: -1.2 } },
      { shipmentId: 'ship-002', eventType: 'GPS_PING', lat: 52.2, lng: -1.5, actor: driver1.id, timestamp: new Date(Date.now() - 900000), metadata: { lat: 52.2, lng: -1.5 } },
      { shipmentId: 'ship-002', eventType: 'GPS_PING', lat: 52.8, lng: -1.9, actor: driver1.id, timestamp: new Date(Date.now() - 300000), metadata: { lat: 52.8, lng: -1.9 } },
    ],
  })

  // Update driver's last position
  await prisma.driver.update({
    where: { id: driver1.id },
    data: { lastLat: 52.8, lastLng: -1.9, lastSeen: new Date(), status: 'ON_ROUTE' },
  })

  // Open exception
  await prisma.exception.upsert({
    where: { id: 'exc-001' },
    update: {},
    create: {
      id: 'exc-001',
      shipmentId: 'ship-002',
      type: 'LATE_DELIVERY',
      description: 'Shipment delayed due to traffic on M1',
      status: 'OPEN',
    },
  })

  // Appointment
  const aptDate = new Date()
  aptDate.setHours(10, 0, 0, 0)
  const aptEnd = new Date(aptDate)
  aptEnd.setHours(11, 0, 0, 0)

  await prisma.appointment.upsert({
    where: { id: 'apt-001' },
    update: {},
    create: {
      id: 'apt-001',
      tenantId: tenant.id,
      locationId: depot.id,
      companyName: 'Rapid Deliveries Ltd',
      contactName: 'Jane Brown',
      contactEmail: 'jane@rapiddeliveries.com',
      startTime: aptDate,
      endTime: aptEnd,
      status: 'CONFIRMED',
      notes: 'Pallet collection',
    },
  })

  console.log('\n✅ Seed complete!')
  console.log('\nDemo login credentials:')
  console.log('  Workspace: demo')
  console.log('  Admin:   admin@fleetflow.com / password123')
  console.log('  Planner: planner@fleetflow.com / password123')
  console.log('  Driver:  driver@fleetflow.com / password123')
  console.log('\n  Customer tracking: /track/<shipment.trackingToken>')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
