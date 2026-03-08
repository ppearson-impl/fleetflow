import Link from 'next/link'

export default function HelpPage() {
  const sections = [
    {
      id: 'getting-started',
      title: '🚀 Getting Started',
      description: 'Learn the basics of FleetFlow',
      articles: [
        {
          title: 'Dashboard Overview',
          description: 'Understand the main Control Tower dashboard and key metrics',
          content: `The Control Tower dashboard displays real-time KPIs for your entire fleet:

• On-Time %: Percentage of deliveries completed within planned time window
• Late Deliveries: Count of shipments delivered after scheduled time
• Active Routes: Number of routes currently in DISPATCHED or IN_PROGRESS status
• Open Exceptions: Unresolved issues affecting shipments
• Active Drivers: Count of drivers currently on routes

The delivery trend chart shows historical daily completion rates over the last 7 days, helping you identify patterns and optimize routing.`,
        },
        {
          title: 'Navigation Guide',
          description: 'How to move between different parts of the app',
          content: `Use the left sidebar to access main sections:

1. **Control Tower** - Main dashboard with KPIs and trends
2. **Shipments** - View all shipments, search, filter by status, import via CSV
3. **Route Planning** - Create routes, plan stops, optimize sequences
4. **Dispatch** - Assign drivers and vehicles, dispatch routes to drivers
5. **Live Tracking** - Monitor active shipments in real-time with GPS locations
6. **Appointments** - Manage depot booking slots and customer appointments
7. **Settings** - User management, driver profiles, vehicle fleet, locations`,
        },
      ],
    },
    {
      id: 'shipments',
      title: '📦 Shipment Management',
      description: 'Create, track, and manage shipments',
      articles: [
        {
          title: 'Shipment List & Search',
          description: 'Find and filter shipments quickly',
          content: `The Shipments page shows all orders in your system:

**Search & Filter:**
- Search by reference, customer name, or location
- Filter by status: PENDING, PLANNED, DISPATCHED, IN_TRANSIT, DELIVERED, FAILED, CANCELLED
- Results show: order reference, customer, origin→destination, status, assigned driver, planned date

**Actions:**
- Click any shipment row to view detailed information
- "New Shipment" button creates individual orders
- "Import CSV" loads multiple shipments at once`,
        },
        {
          title: 'Shipment Detail Page',
          description: 'Complete shipment information and timeline',
          content: `Click any shipment to view its complete journey. Four tabs provide different views:

**Overview Tab:**
- Order reference and tracking token for customer tracking
- Origin and destination addresses with coordinates
- Assigned route, driver, and vehicle
- Delivery items with quantities, weights, and volumes
- All stops on the route with status and time windows

**Timeline Tab:**
- Chronological event history from creation to delivery
- Icons for each event type (created, planned, dispatched, arrived, delivered)
- Timestamps and actor names (who performed each action)
- GPS coordinates for location events

**Map Tab:**
- Leaflet map showing origin, destination, and all stops
- Polyline path connecting all stops in sequence
- Click markers for coordinate details

**Documents Tab:**
- Proof of Delivery (POD) with recipient signature
- POD photo if captured during delivery
- Delivery notes and timestamp
- Other shipment documents (invoices, customs forms, etc.)`,
        },
        {
          title: 'Creating Shipments',
          description: 'Add new shipments to the system',
          content: `Two ways to create shipments:

**Individual Creation:**
1. Click "New Shipment" button on /shipments
2. Select customer, enter origin and destination
3. Add delivery items (description, quantity, weight, volume)
4. Set planned delivery date
5. Click Create

**Bulk Import (CSV):**
1. Prepare CSV with columns: customer, reference, origin, originLat, originLng, destination, destLat, destLng, plannedDate, items
2. Click "Import CSV" on /shipments
3. Select file and upload
4. System creates orders and shipments automatically
5. Check import results for any errors

**Status Progression:**
PENDING → PLANNED → DISPATCHED → IN_TRANSIT → DELIVERED (or FAILED if delivery issues)`,
        },
      ],
    },
    {
      id: 'routing',
      title: '🗺️ Route Planning & Dispatch',
      description: 'Create, optimize, and dispatch routes',
      articles: [
        {
          title: 'Route Planning Board',
          description: 'Build efficient delivery routes',
          content: `The planning board helps you organize shipments into routes:

**Left Panel - Unplanned Shipments:**
- Shows all shipments not yet assigned to a route
- Search and filter to find specific shipments
- Drag shipments onto the map to add them to routes

**Right Panel - Draft Routes:**
- Display existing routes in DRAFT or PLANNED status
- Show stops, distance, estimated duration, assigned driver/vehicle
- Routes are editable until dispatched

**Map View:**
- Visualize shipments and stops geographically
- Drag shipments to reorder stops
- See total route distance and time

**Route Optimization:**
- Click "Optimize" on a route to reorder stops by nearest-neighbor algorithm
- Minimizes total distance while maintaining first/last stop
- Preview changes before applying`,
        },
        {
          title: 'Dispatch Operations',
          description: 'Assign resources and dispatch routes',
          content: `Dispatch page manages route execution:

**Ready to Dispatch Section:**
- Shows routes in PLANNED status ready for drivers
- Assign driver from available drivers list
- Assign vehicle from available vehicles list
- Click Dispatch button to send to driver
- Route status changes to DISPATCHED
- Driver notification sent (in-app alert)

**Active Routes Section:**
- Shows DISPATCHED and IN_PROGRESS routes
- Real-time stop progress visualization
- Stop-by-stop status (PENDING, ARRIVED, DELIVERED, FAILED)
- Click stop to see details and any issues
- Monitor ETA and completion percentage`,
        },
      ],
    },
    {
      id: 'tracking',
      title: '📡 Live Tracking & Monitoring',
      description: 'Monitor active deliveries in real-time',
      articles: [
        {
          title: 'Live Tracking Map',
          description: 'Real-time GPS tracking of shipments',
          content: `The Live Tracking page shows active shipments with GPS locations:

**Map Display:**
- Green markers = shipment origin locations
- Blue markers = current driver positions (updated every 30 seconds)
- Red markers = delivery destinations
- Lines connect shipments to current driver positions

**Shipment List (Right Panel):**
- Active shipments in DISPATCHED or IN_TRANSIT status
- Driver name assigned to each shipment
- Current GPS coordinates
- Last updated timestamp
- Customer details

**Status Indicators:**
- Green = on-time (within planned time window)
- Orange = approaching time window deadline
- Red = late (past promised delivery time)

**Auto-Refresh:**
- 30-second polling updates driver positions
- Manual refresh button for immediate update`,
        },
        {
          title: 'Exception Handling',
          description: 'Identify and resolve delivery issues',
          content: `Exceptions flag issues requiring attention:

**Exception Types:**
- LATE_DELIVERY: Shipment behind schedule
- MISSED_TIME_WINDOW: Delivery outside customer's preferred window
- VEHICLE_BREAKDOWN: Vehicle mechanical failure
- DRIVER_INCIDENT: Driver-related issue
- CUSTOMER_UNAVAILABLE: Recipient not home or inaccessible
- DAMAGED_GOODS: Cargo damage detected
- OTHER: Miscellaneous issues

**Viewing Exceptions:**
- Dashboard shows open exception count
- Click exception to view details and assigned owner
- Status can be OPEN, IN_PROGRESS, RESOLVED, or CLOSED

**Resolving Exceptions:**
- Assign exception to team member
- Update status as work progresses
- Add notes for resolution details
- Close when fully resolved`,
        },
      ],
    },
    {
      id: 'driver-app',
      title: '📱 Driver App (PWA)',
      description: 'Mobile app for drivers to complete deliveries',
      articles: [
        {
          title: 'Getting Started as a Driver',
          description: 'How drivers use the mobile app',
          content: `The Driver App is a Progressive Web App (PWA) accessible on mobile:

**Access:**
1. Navigate to /driver on mobile (iOS Safari or Android Chrome)
2. On Chrome: Menu → "Add to Home Screen" to install as app
3. Icon appears on home screen for quick access

**Login:**
- Use driver credentials provided by dispatcher
- Select workspace
- Tap Sign In
- Session expires after 7 days (automatic re-login)`,
        },
        {
          title: 'Delivery Workflow',
          description: 'Step-by-step delivery process',
          content: `**Step 1: View Assigned Route**
- Driver sees assigned routes with all stops
- Can filter by route status
- Stop count and progress indicator

**Step 2: Stop Detail**
- Tap stop to view full information
- Customer name, address, contact phone
- Delivery items to be handed over
- Time window (if applicable)
- Navigate button opens Google/Apple Maps
- Tap phone number to call customer

**Step 3: Mark Arrived**
- Tap "📍 Mark Arrived" when at location
- App records GPS location and timestamp
- Moves to Proof of Delivery (POD) step

**Step 4: Complete Proof of Delivery**
Required:
- Recipient Name: who accepted the package
- Signature: tap pad and sign with finger

Optional:
- Photo: tap camera icon to capture delivery photo
- Notes: "left with neighbour", "requires signature", etc.

Tap "✓ Complete Delivery" to submit and move to next stop

**Step 5: Handle Issues (if applicable)**
If delivery fails:
- Tap "✗ Can't Deliver"
- Select reason: not home, access issue, wrong address, refused, damaged
- Stop marked FAILED, move to next stop`,
        },
        {
          title: 'Notifications & Feedback',
          description: 'Real-time feedback during delivery',
          content: `**Toast Notifications (bottom of screen):**
- 🟢 Green = success (arrived, POD saved, delivery complete)
- 🔴 Red = error (connection failed, validation error)
- 🔵 Blue = info (route loaded, stop skipped)
- Auto-dismiss after 3.5 seconds

**Network Handling:**
- App works offline (cached route data)
- Failed actions queued for retry
- Automatic sync when connection restored
- Never loses data - all actions eventually saved`,
        },
      ],
    },
    {
      id: 'settings',
      title: '⚙️ Administration & Settings',
      description: 'Manage users, drivers, vehicles, and locations',
      articles: [
        {
          title: 'User Management',
          description: 'Create and manage team members',
          content: `The Users tab in Settings allows admin to manage team:

**User List:**
- Name, email, role, and status displayed
- Status: ACTIVE, INACTIVE, or INVITED

**User Roles:**
- **ADMIN**: Full access to all features and settings
- **PLANNER**: Can create/edit routes and shipments
- **OPERATIONS_MANAGER**: Can dispatch routes and view tracking
- **DRIVER**: Mobile app access only
- **CUSTOMER**: Customer tracking portal only

**Creating Users:**
1. Click "New User" in Settings
2. Enter name, email, role
3. Set status to ACTIVE
4. Click Create
5. User receives email with login credentials
6. Can reset password if forgotten`,
        },
        {
          title: 'Driver Management',
          description: 'Manage driver profiles and availability',
          content: `The Drivers tab shows your driver team:

**Driver Information:**
- Name, phone, email
- License type (B, C, CE, HGV, etc.)
- Current status: AVAILABLE, ON_ROUTE, OFFLINE

**Creating Drivers:**
1. Click "New Driver" in Settings
2. Enter name, phone, email
3. Select license type
4. Set status
5. Click Create
6. Driver can now be assigned to routes

**Availability:**
- AVAILABLE: Ready for new dispatch
- ON_ROUTE: Currently on active route
- OFFLINE: Not available for dispatch
- Update status manually or auto-update via app`,
        },
        {
          title: 'Vehicle Fleet Management',
          description: 'Manage vehicles and capacity',
          content: `The Vehicles tab manages your fleet:

**Vehicle Information:**
- Registration plate (unique ID)
- Vehicle type (Van, HGV, Sprinter, etc.)
- Weight capacity (kg)
- Volume capacity (m³)
- Status: AVAILABLE, IN_USE, MAINTENANCE, RETIRED

**Creating Vehicles:**
1. Click "New Vehicle" in Settings
2. Enter registration, type
3. Input capacity limits
4. Set status
5. Click Create
6. Vehicle available for route assignment

**Capacity Planning:**
- System checks load against vehicle capacity
- Helps prevent overloading
- Weight: sum of item weights ≤ vehicle capacity
- Volume: sum of item volumes ≤ vehicle capacity`,
        },
        {
          title: 'Locations & Appointments',
          description: 'Manage depot locations and booking slots',
          content: `The Locations tab manages your facilities:

**Location Information:**
- Name (e.g., "Dartford Distribution Centre")
- Address with postcode
- GPS coordinates
- Appointments associated with location

**Appointments:**
- Book customer pickup/delivery slots
- Time slot management for capacity planning
- Status: PENDING, CONFIRMED, CANCELLED, COMPLETED

**Creating Appointments:**
1. Go to Appointments page
2. Click "New Appointment"
3. Select location
4. Enter company name and contact
5. Select start/end time
6. Click Create
7. Confirmation email sent to customer`,
        },
      ],
    },
    {
      id: 'faq',
      title: '❓ Frequently Asked Questions',
      description: 'Common questions and answers',
      articles: [
        {
          title: 'How do I import multiple shipments?',
          description: 'Bulk import guide',
          content: `Use CSV import for bulk shipments:

1. Prepare CSV file with columns:
   - customer: Customer name (must exist)
   - reference: Order reference (unique)
   - origin: Pick-up location address
   - originLat, originLng: Coordinates
   - destination: Delivery location
   - destLat, destLng: Coordinates
   - plannedDate: YYYY-MM-DD format
   - items: Comma-separated item descriptions

2. Go to /shipments
3. Click "Import CSV"
4. Select your CSV file
5. Review preview
6. Click Import
7. Check results (success/error count)

**CSV Example:**
\`\`\`
customer,reference,origin,originLat,originLng,destination,destLat,destLng,plannedDate,items
Acme Corp,ORD-001,10 Baker Street,51.5,0.1,25 Deansgate,53.48,-2.24,2026-03-10,"Boxes x5,Electronics x2"
\`\`\``,
        },
        {
          title: 'How do I optimize a route?',
          description: 'Route optimization for efficiency',
          content: `Minimize distance with automatic optimization:

1. Go to Route Planning board
2. Select a route (click the route card)
3. Click "Optimize" button
4. Algorithm reorders stops using nearest-neighbor approach
5. First stop (depot) and last stop (final destination) stay fixed
6. Middle stops reordered to minimize total distance
7. Preview new order before applying
8. Click "Apply" to save changes

**Why Optimize:**
- Reduces driving distance
- Saves fuel costs
- Faster delivery times
- Improves on-time percentage`,
        },
        {
          title: 'What happens if a delivery fails?',
          description: 'Failed delivery process',
          content: `When a delivery cannot be completed:

**Driver Action:**
1. At the location, tap "✗ Can't Deliver"
2. Select reason from dropdown:
   - NOT_HOME: Customer not present
   - ACCESS_ISSUE: Can't access location
   - WRONG_ADDRESS: Address incorrect
   - REFUSED: Customer refuses delivery
   - DAMAGED_GOODS: Cargo damaged

3. Tap "Confirm Failure"
4. Stop marked FAILED, exception created
5. Driver moves to next stop

**Dispatcher Action:**
1. Exception appears in dashboard
2. Click exception to view reason
3. Contact customer to reschedule
4. Create new shipment or add to next route
5. Update exception status as work progresses`,
        },
        {
          title: 'How do drivers access the app offline?',
          description: 'Offline app functionality',
          content: `The Driver App works offline using service workers:

**Offline Capabilities:**
- Download routes before going offline
- View assigned stops and customer info
- Mark stops as arrived and completed
- Add signature and photos
- See GPS coordinates

**What Syncs:**
- Changes automatically queue when offline
- When connection restored, changes upload automatically
- No data is lost
- User sees success notifications on sync

**Best Practice:**
- Download route while online
- Perform deliveries (works offline)
- Drive back to depot or safe location with signal
- App auto-syncs all updates
- Check notifications for successful sync`,
        },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">FleetFlow Help Center</h1>
          <p className="text-lg text-gray-600">
            Comprehensive guide to managing your delivery operations. Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Search and Navigation */}
        <div className="bg-white rounded-xl p-6 mb-8 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Browse Sections</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <h3 className="font-semibold text-gray-900">{section.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{section.description}</p>
              </a>
            ))}
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-12">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="bg-white rounded-xl p-8 shadow-sm scroll-mt-20"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{section.title}</h2>
              <p className="text-gray-600 mb-6">{section.description}</p>

              <div className="space-y-8">
                {section.articles.map((article, idx) => (
                  <div key={idx} className="border-l-4 border-blue-500 pl-6">
                    <h3 className="text-xl font-bold text-gray-900">{article.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{article.description}</p>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                        {article.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
          <p className="text-gray-600 mb-4">
            Can't find what you're looking for? Contact your FleetFlow administrator for assistance.
          </p>
          <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
