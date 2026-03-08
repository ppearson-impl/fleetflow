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

  // ──── CUSTOMERS (5 across UK regions) ────
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { id: 'cust-acme' },
      update: {},
      create: {
        id: 'cust-acme',
        tenantId: tenant.id,
        name: 'Acme Corp',
        contactEmail: 'orders@acme.com',
        contactPhone: '+44 20 7123 4567',
        address: '10 Baker Street, London W1U 6TJ',
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
        address: '25 Deansgate, Manchester M3 4LQ',
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
        contactPhone: '+44 113 234 5678',
        address: '5 Park Row, Leeds LS1 5HD',
      },
    }),
    prisma.customer.upsert({
      where: { id: 'cust-techvend' },
      update: {},
      create: {
        id: 'cust-techvend',
        tenantId: tenant.id,
        name: 'TechVend Ltd',
        contactEmail: 'orders@techvend.com',
        contactPhone: '+44 121 456 7890',
        address: '42 Broad Street, Birmingham B1 2DS',
      },
    }),
    prisma.customer.upsert({
      where: { id: 'cust-fastsupply' },
      update: {},
      create: {
        id: 'cust-fastsupply',
        tenantId: tenant.id,
        name: 'FastSupply Co',
        contactEmail: 'logistics@fastsupply.co.uk',
        contactPhone: '+44 117 234 5678',
        address: '99 Harbourside, Bristol BS1 5HB',
      },
    }),
  ])

  console.log('Created 5 customers')

  // ──── DRIVERS (4 with varied license types) ────
  const drivers = await Promise.all([
    prisma.driver.upsert({
      where: { id: 'driver-dave' },
      update: {},
      create: {
        id: 'driver-dave',
        tenantId: tenant.id,
        name: 'Dave Driver',
        phone: '+44 7700 900001',
        email: 'dave@fleetflow.com',
        licenseType: 'CE',
        status: 'AVAILABLE',
      },
    }),
    prisma.driver.upsert({
      where: { id: 'driver-sarah' },
      update: {},
      create: {
        id: 'driver-sarah',
        tenantId: tenant.id,
        name: 'Sarah Swift',
        phone: '+44 7700 900002',
        email: 'sarah@fleetflow.com',
        licenseType: 'C',
        status: 'AVAILABLE',
      },
    }),
    prisma.driver.upsert({
      where: { id: 'driver-mike' },
      update: {},
      create: {
        id: 'driver-mike',
        tenantId: tenant.id,
        name: 'Mike Morrison',
        phone: '+44 7700 900003',
        email: 'mike@fleetflow.com',
        licenseType: 'CE',
        status: 'ON_ROUTE',
      },
    }),
    prisma.driver.upsert({
      where: { id: 'driver-emma' },
      update: {},
      create: {
        id: 'driver-emma',
        tenantId: tenant.id,
        name: 'Emma Evans',
        phone: '+44 7700 900004',
        email: 'emma@fleetflow.com',
        licenseType: 'C',
        status: 'AVAILABLE',
      },
    }),
  ])

  console.log('Created 4 drivers')

  // ──── VEHICLES (3 with different capacities) ────
  const vehicles = await Promise.all([
    prisma.vehicle.upsert({
      where: { tenantId_registration: { tenantId: tenant.id, registration: 'AB12 CDE' } },
      update: {},
      create: {
        tenantId: tenant.id,
        registration: 'AB12 CDE',
        type: 'Ford Transit Van',
        capacityWeight: 1000,
        capacityVolume: 10,
        status: 'IN_USE',
      },
    }),
    prisma.vehicle.upsert({
      where: { tenantId_registration: { tenantId: tenant.id, registration: 'XY21 FGH' } },
      update: {},
      create: {
        tenantId: tenant.id,
        registration: 'XY21 FGH',
        type: 'Scania HGV',
        capacityWeight: 10000,
        capacityVolume: 80,
        status: 'AVAILABLE',
      },
    }),
    prisma.vehicle.upsert({
      where: { tenantId_registration: { tenantId: tenant.id, registration: 'CD22 IJK' } },
      update: {},
      create: {
        tenantId: tenant.id,
        registration: 'CD22 IJK',
        type: 'Mercedes Sprinter',
        capacityWeight: 1500,
        capacityVolume: 12,
        status: 'AVAILABLE',
      },
    }),
  ])

  console.log('Created 3 vehicles')

  // ──── LOCATION (depot) ────
  const depot = await prisma.location.upsert({
    where: { id: 'loc-dartford' },
    update: {},
    create: {
      id: 'loc-dartford',
      tenantId: tenant.id,
      name: 'Dartford Distribution Centre',
      address: 'Unit 5, Darent Valley Business Park, Dartford DA1 2RE',
      lat: 51.4364,
      lng: 0.2154,
    },
  })

  console.log('Created depot location')

  // ──── ROUTES (4 realistic multi-stop routes) ────
  const routes = await Promise.all([
    // London morning run
    prisma.route.create({
      data: {
        tenantId: tenant.id,
        driverId: drivers[0].id, // Dave
        vehicleId: vehicles[0].id, // Van
        name: 'London City Morning Run',
        status: 'DISPATCHED',
        plannedStart: new Date(Date.now()),
        distanceKm: 28.5,
        estimatedDuration: 150,
      },
    }),
    // Manchester afternoon run
    prisma.route.create({
      data: {
        tenantId: tenant.id,
        driverId: drivers[1].id, // Sarah
        vehicleId: vehicles[0].id, // Van
        name: 'Manchester Evening Multi-Drop',
        status: 'DISPATCHED',
        plannedStart: new Date(Date.now() + 3600000),
        distanceKm: 35.2,
        estimatedDuration: 180,
      },
    }),
    // Midlands HGV run
    prisma.route.create({
      data: {
        tenantId: tenant.id,
        driverId: drivers[2].id, // Mike
        vehicleId: vehicles[1].id, // HGV
        name: 'Midlands Bulk Distribution',
        status: 'IN_PROGRESS',
        plannedStart: new Date(Date.now() - 7200000),
        distanceKm: 120.8,
        estimatedDuration: 480,
      },
    }),
    // Bristol local run
    prisma.route.create({
      data: {
        tenantId: tenant.id,
        driverId: drivers[3].id, // Emma
        vehicleId: vehicles[2].id, // Sprinter
        name: 'Bristol Local Deliveries',
        status: 'PLANNED',
        plannedStart: new Date(Date.now() + 86400000),
        distanceKm: 32.1,
        estimatedDuration: 160,
      },
    }),
  ])

  console.log('Created 4 routes')

  // ──── CUSTOMERS and ORDERS ────
  const orders = await Promise.all([
    // London orders
    ...Array.from({ length: 6 }).map((_, i) =>
      prisma.order.create({
        data: {
          tenantId: tenant.id,
          customerId: customers[0].id, // Acme
          reference: `ORD-ACME-${String(i + 1).padStart(4, '0')}`,
          status: 'CONFIRMED',
          notes: 'Standard London delivery',
        },
      })
    ),
    // Manchester orders
    ...Array.from({ length: 5 }).map((_, i) =>
      prisma.order.create({
        data: {
          tenantId: tenant.id,
          customerId: customers[1].id, // Globex
          reference: `ORD-GLOBEX-${String(i + 1).padStart(4, '0')}`,
          status: 'CONFIRMED',
          notes: 'Manchester regional delivery',
        },
      })
    ),
    // Birmingham orders
    ...Array.from({ length: 4 }).map((_, i) =>
      prisma.order.create({
        data: {
          tenantId: tenant.id,
          customerId: customers[3].id, // TechVend
          reference: `ORD-TECH-${String(i + 1).padStart(4, '0')}`,
          status: 'CONFIRMED',
          notes: 'Bulk technology supplies',
        },
      })
    ),
    // Bristol orders
    ...Array.from({ length: 6 }).map((_, i) =>
      prisma.order.create({
        data: {
          tenantId: tenant.id,
          customerId: customers[4].id, // FastSupply
          reference: `ORD-FAST-${String(i + 1).padStart(4, '0')}`,
          status: 'CONFIRMED',
          notes: 'Bristol multi-stop delivery',
        },
      })
    ),
    // Leeds orders
    ...Array.from({ length: 3 }).map((_, i) =>
      prisma.order.create({
        data: {
          tenantId: tenant.id,
          customerId: customers[2].id, // Initech
          reference: `ORD-INIT-${String(i + 1).padStart(4, '0')}`,
          status: 'CONFIRMED',
          notes: 'Leeds solution delivery',
        },
      })
    ),
  ])

  console.log('Created 24 orders')

  // ──── SHIPMENTS with realistic statuses and events ────
  const shipmentData: Array<{ orderId: string; route: typeof routes[0]; stopCount: number; status: string; origin: string; destination: string; originLat: number; originLng: number; destLat: number; destLng: number }> = [
    // London route (6 shipments)
    ...Array.from({ length: 6 }).map((_, i) => ({
      orderId: orders[i].id,
      route: routes[0],
      stopCount: 5,
      status: i < 3 ? 'DELIVERED' : i === 3 ? 'IN_TRANSIT' : 'PENDING',
      origin: 'Dartford Distribution Centre, Dartford DA1 2RE',
      destination: `${100 + i * 10} Baker Street Area, London E1${String(i).padStart(2, '0')}`,
      originLat: 51.4364,
      originLng: 0.2154,
      destLat: 51.52 + (Math.random() - 0.5) * 0.05,
      destLng: -0.085 + (Math.random() - 0.5) * 0.05,
    })),
    // Manchester route (5 shipments)
    ...Array.from({ length: 5 }).map((_, i) => ({
      orderId: orders[6 + i].id,
      route: routes[1],
      stopCount: 4,
      status: i < 2 ? 'DELIVERED' : i === 2 ? 'IN_TRANSIT' : 'PLANNED',
      origin: 'Dartford Distribution Centre, Dartford DA1 2RE',
      destination: `${25 + i * 20} Deansgate, Manchester M${String(1 + Math.floor(i / 2)).padStart(1, '0')}`,
      originLat: 51.4364,
      originLng: 0.2154,
      destLat: 53.48 + (Math.random() - 0.5) * 0.05,
      destLng: -2.24 + (Math.random() - 0.5) * 0.05,
    })),
    // Midlands route (4 shipments, bulk HGV)
    ...Array.from({ length: 4 }).map((_, i) => ({
      orderId: orders[11 + i].id,
      route: routes[2],
      stopCount: 3,
      status: i < 2 ? 'DELIVERED' : i === 2 ? 'IN_TRANSIT' : 'FAILED',
      origin: 'Dartford Distribution Centre, Dartford DA1 2RE',
      destination: `Industrial Unit ${String(i + 1)}, Birmingham B${String(1 + i).padStart(1, '0')}`,
      originLat: 51.4364,
      originLng: 0.2154,
      destLat: 52.5 + (Math.random() - 0.5) * 0.1,
      destLng: -1.9 + (Math.random() - 0.5) * 0.1,
    })),
    // Bristol route (6 shipments)
    ...Array.from({ length: 6 }).map((_, i) => ({
      orderId: orders[15 + i].id,
      route: routes[3],
      stopCount: 6,
      status: 'PENDING',
      origin: 'Dartford Distribution Centre, Dartford DA1 2RE',
      destination: `${99 + i * 10} Harbourside Area, Bristol BS${String(1 + Math.floor(i / 2)).padStart(1, '0')}`,
      originLat: 51.4364,
      originLng: 0.2154,
      destLat: 51.45 + (Math.random() - 0.5) * 0.05,
      destLng: -2.6 + (Math.random() - 0.5) * 0.05,
    })),
    // Leeds orders (3 shipments)
    ...Array.from({ length: 3 }).map((_, i) => ({
      orderId: orders[21 + i].id,
      route: routes[0], // Use London route as fallback
      stopCount: 2,
      status: 'PENDING',
      origin: 'Dartford Distribution Centre, Dartford DA1 2RE',
      destination: `${5 + i * 10} Park Row, Leeds LS${String(1 + i).padStart(1, '0')}`,
      originLat: 51.4364,
      originLng: 0.2154,
      destLat: 53.8 + (Math.random() - 0.5) * 0.05,
      destLng: -1.55 + (Math.random() - 0.5) * 0.05,
    })),
  ]

  const shipments = await Promise.all(
    shipmentData.map((data) =>
      prisma.shipment.create({
        data: {
          orderId: data.orderId,
          routeId: data.route.id,
          origin: data.origin,
          destination: data.destination,
          originLat: data.originLat,
          originLng: data.originLng,
          destLat: data.destLat,
          destLng: data.destLng,
          status: data.status,
          plannedDate: new Date(Date.now() + 86400000),
        },
      })
    )
  )

  console.log(`Created ${shipments.length} shipments`)

  // ──── DELIVERY ITEMS ────
  await Promise.all(
    shipments.map((shipment, idx) =>
      Promise.all([
        prisma.deliveryItem.create({
          data: {
            shipmentId: shipment.id,
            description: ['Office supplies box', 'Electronics package', 'Furniture components', 'Textiles bundle', 'Machinery parts'][idx % 5],
            quantity: 1 + Math.floor(Math.random() * 5),
            weight: 5 + Math.random() * 15,
            volume: 0.1 + Math.random() * 0.5,
          },
        }),
        prisma.deliveryItem.create({
          data: {
            shipmentId: shipment.id,
            description: ['Packaging materials', 'Spare components', 'Documentation set'][Math.floor(Math.random() * 3)],
            quantity: 1,
            weight: 2 + Math.random() * 8,
            volume: 0.05 + Math.random() * 0.2,
          },
        }),
      ])
    )
  )

  console.log(`Created delivery items for all shipments`)

  // ──── STOPS ────
  const stops = await Promise.all(
    shipments.map((shipment, idx) => {
      const stopCount = shipmentData[idx].stopCount
      return Promise.all(
        Array.from({ length: stopCount }).map((_, stopIdx) =>
          prisma.stop.create({
            data: {
              routeId: shipmentData[idx].route.id,
              shipmentId: shipment.id,
              sequence: stopIdx + 1,
              location: `Stop ${stopIdx + 1} - ${shipmentData[idx].destination}`,
              lat: shipmentData[idx].destLat + (Math.random() - 0.5) * 0.01,
              lng: shipmentData[idx].destLng + (Math.random() - 0.5) * 0.01,
              status: shipment.status === 'DELIVERED' ? 'DELIVERED' : shipment.status === 'FAILED' ? 'FAILED' : 'PENDING',
              timeWindowStart: new Date(Date.now() + 3600000),
              timeWindowEnd: new Date(Date.now() + 7200000),
              arrivedAt: shipment.status === 'DELIVERED' || shipment.status === 'IN_TRANSIT' || shipment.status === 'FAILED' ? new Date(Date.now() - 1800000) : null,
              completedAt: shipment.status === 'DELIVERED' ? new Date(Date.now() - 600000) : shipment.status === 'FAILED' ? new Date(Date.now() - 600000) : null,
              failureReason: shipment.status === 'FAILED' ? ['NOT_HOME', 'ACCESS_ISSUE', 'DAMAGED_GOODS'][Math.floor(Math.random() * 3)] : null,
            },
          })
        )
      )
    })
  )

  console.log('Created stops')

  // ──── SHIPMENT EVENTS (rich timeline for each shipment) ────
  const baseTime = Date.now()
  await Promise.all(
    shipments.map((shipment, idx) => {
      const events = []
      const status = shipmentData[idx].status

      // All shipments have CREATED event
      events.push(
        prisma.shipmentEvent.create({
          data: {
            shipmentId: shipment.id,
            eventType: 'CREATED',
            description: 'Shipment created and assigned',
            actor: planner.name,
            timestamp: new Date(baseTime - 86400000),
          },
        })
      )

      // Planned shipments only have CREATED
      if (status !== 'PENDING') {
        events.push(
          prisma.shipmentEvent.create({
            data: {
              shipmentId: shipment.id,
              eventType: 'PLANNED',
              description: 'Added to route for delivery',
              actor: planner.name,
              timestamp: new Date(baseTime - 72000000),
            },
          })
        )

        events.push(
          prisma.shipmentEvent.create({
            data: {
              shipmentId: shipment.id,
              eventType: 'DISPATCHED',
              description: 'Dispatched to driver',
              actor: admin.name,
              timestamp: new Date(baseTime - 36000000),
            },
          })
        )
      }

      if (status === 'IN_TRANSIT' || status === 'DELIVERED' || status === 'FAILED') {
        events.push(
          prisma.shipmentEvent.create({
            data: {
              shipmentId: shipment.id,
              eventType: 'ARRIVED',
              description: 'Driver arrived at delivery location',
              actor: 'Mobile GPS',
              timestamp: new Date(baseTime - 3600000),
              lat: shipmentData[idx].destLat + (Math.random() - 0.5) * 0.001,
              lng: shipmentData[idx].destLng + (Math.random() - 0.5) * 0.001,
            },
          })
        )

        if (status === 'IN_TRANSIT') {
          events.push(
            prisma.shipmentEvent.create({
              data: {
                shipmentId: shipment.id,
                eventType: 'GPS_PING',
                description: 'GPS ping recorded',
                lat: shipmentData[idx].destLat + (Math.random() - 0.5) * 0.005,
                lng: shipmentData[idx].destLng + (Math.random() - 0.5) * 0.005,
                timestamp: new Date(baseTime - 1800000),
              },
            })
          )
        }

        if (status === 'DELIVERED') {
          events.push(
            prisma.shipmentEvent.create({
              data: {
                shipmentId: shipment.id,
                eventType: 'DELIVERED',
                description: 'Shipment delivered successfully',
                actor: 'Dave Driver',
                timestamp: new Date(baseTime - 600000),
              },
            })
          )
        }

        if (status === 'FAILED') {
          events.push(
            prisma.shipmentEvent.create({
              data: {
                shipmentId: shipment.id,
                eventType: 'FAILED',
                description: `Delivery failed: ${stops[0]?.failureReason || 'Customer not available'}`,
                actor: 'Dave Driver',
                timestamp: new Date(baseTime - 600000),
              },
            })
          )
        }
      }

      return Promise.all(events)
    })
  )

  console.log('Created shipment events')

  // ──── PODs (for delivered shipments) ────
  await Promise.all(
    shipments.map((shipment) => {
      if (shipmentData[shipments.indexOf(shipment)].status === 'DELIVERED') {
        return prisma.pOD.create({
          data: {
            shipmentId: shipment.id,
            recipientName: ['John Smith', 'Jane Doe', 'Robert Brown', 'Emma Wilson'][Math.floor(Math.random() * 4)],
            notes: ['Left at reception', 'Signed by recipient', 'Left with neighbour', 'Delivered to office'][Math.floor(Math.random() * 4)],
            deliveryTime: new Date(Date.now() - 600000),
          },
        })
      }
      return Promise.resolve(null)
    })
  )

  console.log('Created PODs')

  // ──── EXCEPTIONS (variety of types) ────
  const exceptions = []
  for (let i = 0; i < shipments.length; i++) {
    if (Math.random() < 0.15) {
      // 15% chance of exception
      const exceptionTypes = [
        { type: 'LATE_DELIVERY', description: 'Shipment delayed due to traffic on M25' },
        { type: 'MISSED_TIME_WINDOW', description: 'Customer not available during scheduled window' },
        { type: 'VEHICLE_BREAKDOWN', description: 'Vehicle required minor roadside repair' },
        { type: 'DAMAGED_GOODS', description: 'Packaging damage detected on inspection' },
        { type: 'CUSTOMER_UNAVAILABLE', description: 'No one present at delivery address' },
      ]
      const exc = exceptionTypes[Math.floor(Math.random() * exceptionTypes.length)]

      exceptions.push(
        prisma.exception.create({
          data: {
            shipmentId: shipments[i].id,
            type: exc.type,
            description: exc.description,
            status: Math.random() < 0.6 ? 'OPEN' : 'IN_PROGRESS',
            assignedTo: Math.random() < 0.5 ? planner.name : undefined,
          },
        })
      )
    }
  }

  await Promise.all(exceptions)
  console.log(`Created ${exceptions.length} exceptions`)

  // ──── APPOINTMENTS ────
  await Promise.all([
    prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        locationId: depot.id,
        companyName: 'Acme Corp',
        contactName: 'John Manager',
        contactEmail: 'john@acme.com',
        startTime: new Date(Date.now() + 86400000),
        endTime: new Date(Date.now() + 90000000),
        status: 'CONFIRMED',
        notes: 'Weekly goods collection slot',
      },
    }),
    prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        locationId: depot.id,
        companyName: 'TechVend Ltd',
        contactName: 'Sarah Tech',
        contactEmail: 'sarah@techvend.com',
        startTime: new Date(Date.now() + 172800000),
        endTime: new Date(Date.now() + 176400000),
        status: 'PENDING',
        notes: 'Bulk delivery appointment',
      },
    }),
  ])

  console.log('Created appointments')

  console.log('✅ Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
