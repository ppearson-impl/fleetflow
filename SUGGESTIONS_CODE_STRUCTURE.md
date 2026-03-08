# Route Suggestions API - Code Structure

## File Organization

```
app/
└── api/
    └── routes/
        ├── route.ts                 (GET: list routes, POST: create route)
        ├── [id]/
        │   └── route.ts             (GET/PATCH: single route)
        ├── optimize/
        │   └── route.ts             (POST: reorder stops)
        └── suggestions/
            └── route.ts             (GET: generate suggestions) ← NEW
```

## Module Exports

### Main Handler
```typescript
export async function GET(req: NextRequest): Promise<NextResponse>
```

The single exported GET handler that:
1. Validates authentication
2. Parses query parameters
3. Routes to specific route analysis or bulk overview
4. Returns structured suggestions with metrics

## Type Definitions

### SuggestionType Enum
```typescript
type SuggestionType =
  | 'REORDER_STOPS'              // Stop sequence optimization
  | 'SPLIT_ROUTE'                // Large route decomposition
  | 'MERGE_ROUTES'               // Combine compatible routes
  | 'CHANGE_VEHICLE'             // Vehicle downsizing/upsizing
  | 'CONSOLIDATE_STOPS'          // Geographic clustering
  | 'TIME_WINDOW_OPTIMIZATION'   // Schedule flexibility
```

### Priority System
```typescript
type Priority = 'HIGH' | 'MEDIUM' | 'LOW'

// HIGH (>15% savings)     → Implement within 1-2 days
// MEDIUM (8-15% savings)  → Implement within 1 week
// LOW (<8% savings)       → Implement as convenient
```

### Complexity Levels
```typescript
type Complexity = 'EASY' | 'MEDIUM' | 'HARD'

// EASY   (<30 min, admin approval)
// MEDIUM (30m-2hrs, planner approval)
// HARD   (2+ hrs, management approval)
```

### Data Structures

#### RouteSuggestion Interface
```typescript
interface RouteSuggestion {
  id: string                          // Unique suggestion ID
  type: SuggestionType                // Type of optimization
  priority: Priority                  // Implementation urgency
  description: string                 // User-friendly title
  rationale: string                   // Why this matters
  implementation: {
    steps: string[]                   // How to implement
    complexity: Complexity            // Effort required
  }
  impact: {
    distanceSavingKm?: number         // Distance reduction
    distanceSavingPercent?: number    // % improvement
    timeSavingMinutes?: number        // Time reduction
    timeSavingPercent?: number        // % improvement
    fuelSavingLiters?: number         // Fuel consumption
    costSavingUSD?: number            // Dollar savings
  }
  affectedStops?: string[]            // Relevant stop IDs
  suggestedAlternativeRouteId?: string // Related route
}
```

#### RouteMetrics Interface
```typescript
interface RouteMetrics {
  stopCount: number                   // Number of deliveries
  distanceKm: number                  // Total distance
  estimatedTimeMinutes: number        // Duration estimate
  averageStopDistance: number         // Km between stops
  totalWeight: number                 // Combined item weight
  totalVolume: number                 // Combined item volume
  vehicleCapacityUtilization: {
    weight: number                    // % of weight capacity
    volume: number                    // % of volume capacity
  }
}
```

#### SuggestionsResponse Interface
```typescript
interface SuggestionsResponse {
  routeId: string                     // Route being analyzed
  metrics: RouteMetrics               // Detailed statistics
  suggestions: RouteSuggestion[]      // Ranked suggestions
  summary: {
    totalSavings: {
      distanceKm: number
      timeMinutes: number
      fuelLiters: number
      costUSD: number
    }
    potentialROI: string              // Return on investment
  }
}
```

## Function Architecture

### Public Functions

#### GET(req: NextRequest)
**Purpose:** Main HTTP handler

**Flow:**
1. Authenticate session
2. Parse query parameters
3. Route based on routeId presence
4. Return detailed or bulk response

**Error Handling:**
- 401: Not authenticated
- 404: Route not found
- 400: Invalid data
- 500: Unexpected error

---

### Private Functions

#### calculateRouteMetrics()
**Purpose:** Extract and compute route statistics

**Input:**
- Prisma Route object
- Stops with coordinates

**Output:** RouteMetrics object

**Calculations:**
- Distance: From route.distanceKm
- Time: From route.estimatedDuration
- Weight/Volume: Sum of delivery items
- Utilization: Against vehicle capacity

---

#### generateSuggestions()
**Purpose:** Analyze route and generate all applicable suggestions

**Input:**
- Route ID and data
- Stops array
- Metrics
- Sorting metric preference

**Output:** RouteSuggestion[] (0-6 suggestions)

**Algorithm:**
1. Check REORDER_STOPS (if inefficient)
2. Find clusters for CONSOLIDATE_STOPS
3. Analyze vehicle usage for CHANGE_VEHICLE
4. Evaluate size for SPLIT_ROUTE
5. Check time windows for TIME_WINDOW_OPTIMIZATION

---

#### calculateRouteMetrics()
**Purpose:** Extract and compute route statistics

**Process:**
```
Route Object
    ├── distanceKm → metrics.distanceKm
    ├── estimatedDuration → metrics.estimatedTimeMinutes
    ├── Stops with DeliveryItems
    │   ├── Sum weights → metrics.totalWeight
    │   ├── Sum volumes → metrics.totalVolume
    │   └── Calculate utilization percentages
    └── Vehicle capacity
        ├── Compare weight vs capacity
        └── Compare volume vs capacity
```

---

#### generateSuggestions()
**Purpose:** Generate all applicable optimization suggestions

**Process:**
```
Route Analysis
    ├─ Inefficiency Check (REORDER_STOPS)
    │  ├── Calculate current distance
    │  ├── Calculate optimal distance
    │  ├── Compare ratio (>1.3 = inefficient)
    │  └── Generate suggestion if inefficient
    │
    ├─ Clustering Analysis (CONSOLIDATE_STOPS)
    │  ├── Find stops within 0.5km
    │  ├── Group into clusters
    │  └── Generate per cluster
    │
    ├─ Vehicle Analysis (CHANGE_VEHICLE)
    │  ├── Check weight utilization < 50%
    │  ├── Check stop count ≤ 8
    │  └── Generate if both conditions met
    │
    ├─ Size Analysis (SPLIT_ROUTE)
    │  ├── Check stops > 12 OR (stops > 8 AND weight > 85%)
    │  ├── Calculate split point
    │  └── Generate if conditions met
    │
    └─ Time Window Analysis (TIME_WINDOW_OPTIMIZATION)
       ├── Find stops with time windows
       ├── Check for early morning (< 9 AM)
       └── Generate if 2+ early stops
```

---

#### calculateOptimalDistance()
**Purpose:** Compute optimal route distance using nearest-neighbor algorithm

**Input:** Stops with lat/lng coordinates

**Algorithm:**
```
Start at depot (51.5074, -0.1278)
While unvisited stops remain:
    Find nearest unvisited stop
    Add to route
    Update current position
Return to depot
Calculate total distance
```

**Formula:** Haversine great-circle distance

---

#### findClusters()
**Purpose:** Identify geographically grouped stops

**Algorithm:**
```
For each unvisited stop:
    Create new cluster
    Add current stop
    Find all other stops within 0.5km
    Add to same cluster
    Mark as visited
Return all clusters with 2+ stops
```

**Complexity:** O(n²)

---

#### haversineKmHelper()
**Purpose:** Calculate precise distance between GPS coordinates

**Formula:**
```
R = Earth radius (6371 km)
Δlat = (lat2 - lat1) × π/180
Δlng = (lng2 - lng1) × π/180

a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlng/2)
d = R × 2 × atan2(√a, √(1-a))
```

---

#### calculateSavingsSummary()
**Purpose:** Aggregate impact across all suggestions

**Input:** RouteSuggestion[] array

**Output:** Summary with totals and ROI

**Calculations:**
```
totalDistanceSaving = sum(suggestion.impact.distanceSavingKm)
totalTimeSaving = sum(suggestion.impact.timeSavingMinutes)
totalFuelSaving = sum(suggestion.impact.fuelSavingLiters)
totalCostSaving = sum(suggestion.impact.costSavingUSD)

ROI = (totalCostSaving / 50) × 100  // 50 = estimated effort cost
```

---

#### handleGeneralSuggestions()
**Purpose:** Generate bulk overview for all routes in tenant

**Process:**
1. Fetch top 20 routes in DRAFT/PLANNED status
2. Calculate metrics for each
3. Generate suggestions
4. Summarize top suggestion per route
5. Return overview

---

## Constants

```typescript
const FUEL_COST_PER_KM = 0.08        // USD/km fuel cost
const TIME_VALUE_PER_HOUR = 45        // USD/hour labor cost
const MIN_CLUSTERING_DISTANCE = 0.5  // km for stop clustering
const INEFFICIENCY_THRESHOLD = 1.3   // 30% above optimal
const DEPOT_LAT = 51.5074            // Default depot latitude
const DEPOT_LNG = -0.1278            // Default depot longitude
```

## Data Flow Diagram

```
GET Request
    ↓
Authentication Check
    ├─ FAIL → 401 Unauthorized
    └─ OK ↓
Parse Query Parameters (routeId, metric)
    ├─ No routeId ↓
    │  handleGeneralSuggestions()
    │  ├─ Fetch 20 routes
    │  ├─ Calculate metrics
    │  ├─ Generate suggestions
    │  └─ Return overview
    │
    └─ With routeId ↓
       Fetch Route (Prisma)
           ├─ Not found → 404
           └─ Found ↓
       Filter stops with coordinates
           ├─ None → 400 Bad Request
           └─ Some ↓
       calculateRouteMetrics()
           ↓ RouteMetrics
       generateSuggestions()
           ├─ REORDER_STOPS analysis
           ├─ CONSOLIDATE_STOPS analysis
           ├─ CHANGE_VEHICLE analysis
           ├─ SPLIT_ROUTE analysis
           └─ TIME_WINDOW_OPTIMIZATION analysis
               ↓ RouteSuggestion[]
       Sort suggestions by impact
           ↓
       calculateSavingsSummary()
           ↓ Summary
       Return SuggestionsResponse (200 OK)
```

## Performance Considerations

### Time Complexity
- **Haversine calculation:** O(1)
- **Clustering algorithm:** O(n²) where n = stops
- **Nearest neighbor:** O(n²)
- **Overall:** O(n²) for single route

### Space Complexity
- **Suggestions array:** O(k) where k ≤ 6
- **Metrics objects:** O(1)
- **Total:** O(n) for stops data

### Optimization Strategies
1. Cache metrics calculations
2. Limit bulk overview to 20 routes
3. Use indexed database queries
4. Pre-calculate for batch jobs
5. Consider Redis caching for recurring queries

## Testing Strategy

### Unit Tests
- haversineKmHelper() with known coordinates
- findClusters() with various distances
- calculateOptimalDistance() with simple routes

### Integration Tests
- GET with valid routeId
- GET without routeId (bulk)
- GET with different metrics
- Error scenarios (401, 404, 400)

### Performance Tests
- Response time for 10 stops
- Response time for 50 stops
- Bulk overview with 20 routes
- Load test with concurrent requests

## Security Considerations

1. **Authentication:** Required for all requests
2. **Authorization:** Tenant isolation enforced
3. **Input Validation:** Query parameters type-checked
4. **SQL Injection:** Prisma parameterized queries
5. **Error Handling:** Generic error messages

## Dependencies

```typescript
// Next.js framework
import { NextRequest, NextResponse } from 'next/server'

// Database ORM
import { prisma } from '@/lib/prisma'

// Authentication
import { getSessionFromRequest } from '@/lib/auth'

// (No external optimization libraries - algorithms implemented native)
```

## Future Enhancements

1. **Machine Learning Integration**
   - Pattern recognition in route inefficiencies
   - Predictive cost estimation

2. **Advanced Algorithms**
   - 2-opt local search
   - Genetic algorithms
   - Ant colony optimization

3. **Real-time Data**
   - Traffic-aware distance calculation
   - Weather impact analysis
   - Dynamic vehicle assignment

4. **Multi-objective Optimization**
   - Balance cost vs. delivery time
   - Customer satisfaction factors
   - Driver preferences

5. **A/B Testing**
   - Compare optimization strategies
   - Track actual vs. predicted savings
   - Continuous improvement

---

**Version:** 1.0
**Created:** March 8, 2026
