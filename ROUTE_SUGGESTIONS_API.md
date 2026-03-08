# Route Optimization Suggestions Endpoint

## Overview

The `/api/routes/suggestions` endpoint provides intelligent, data-driven optimization recommendations for delivery routes. It analyzes route configurations and generates actionable suggestions to reduce distance, time, fuel consumption, and operational costs.

**File Location:** `/app/api/routes/suggestions/route.ts`

## Endpoint Details

### URL
```
GET /api/routes/suggestions
```

### Authentication
Required - Session authentication via `getSessionFromRequest()`. Returns 401 Unauthorized if not authenticated.

### Tenant Isolation
All requests are filtered by tenant ID from authenticated session for data isolation.

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `routeId` | string | No | None | Specific route ID to analyze. If omitted, returns overview of all routes |
| `metric` | string | No | `distance` | Sorting metric: `distance`, `time`, or `efficiency` |

## Request Examples

### Detailed suggestions for specific route
```
GET /api/routes/suggestions?routeId=route_123&metric=distance
```

### Overview of all routes with improvement opportunities
```
GET /api/routes/suggestions
```

## Response Structure

### Detailed Route Analysis (200 OK)

```json
{
  "routeId": "route_123",
  "metrics": {
    "stopCount": 12,
    "distanceKm": 48.5,
    "estimatedTimeMinutes": 180,
    "averageStopDistance": 4.04,
    "totalWeight": 250.5,
    "totalVolume": 12.8,
    "vehicleCapacityUtilization": {
      "weight": 0.65,
      "volume": 0.42
    }
  },
  "suggestions": [
    {
      "id": "sug_1709948400000_a1b2c3d4e",
      "type": "REORDER_STOPS",
      "priority": "HIGH",
      "description": "Reorder stops using optimized sequencing algorithm",
      "rationale": "Current stop sequence inefficient. Can reduce distance from 48.5km to 38.2km.",
      "implementation": {
        "steps": [
          "Apply nearest-neighbor optimization",
          "Respect time windows",
          "Update stop sequences",
          "Recalculate route metrics"
        ],
        "complexity": "EASY"
      },
      "impact": {
        "distanceSavingKm": 10.3,
        "distanceSavingPercent": 21.2,
        "timeSavingMinutes": 12,
        "fuelSavingLiters": 0.8,
        "costSavingUSD": 82.40
      }
    }
  ],
  "summary": {
    "totalSavings": {
      "distanceKm": 10.3,
      "timeMinutes": 12,
      "fuelLiters": 0.8,
      "costUSD": 82.40
    },
    "potentialROI": "165% ROI on optimization effort"
  }
}
```

### Bulk Overview Response

```json
{
  "summary": {
    "totalRoutes": 24,
    "routesWithSuggestions": 18
  },
  "routes": [
    {
      "routeId": "route_123",
      "routeName": "Downtown Deliveries",
      "stopCount": 12,
      "suggestionCount": 3,
      "topSuggestion": {
        "type": "REORDER_STOPS",
        "priority": "HIGH"
      }
    }
  ],
  "message": "Use ?routeId=<id> to get detailed suggestions"
}
```

## Error Responses

| Status | Response | Cause |
|--------|----------|-------|
| 401 | `{"error": "Unauthorized"}` | Not authenticated |
| 404 | `{"error": "Route not found"}` | Route doesn't exist or inaccessible |
| 400 | `{"error": "Route has no stops with valid coordinates"}` | Missing GPS data |
| 500 | `{"error": "Internal server error"}` | Unexpected server error |

## Suggestion Types

### 1. REORDER_STOPS
Detects inefficient stop sequencing and recommends nearest-neighbor reordering.

**Triggers:** Current distance > 30% above optimal

**Complexity:** EASY

**Typical Impact:** 15-25% distance reduction

---

### 2. CONSOLIDATE_STOPS
Identifies geographically clustered stops (within 0.5km) for consolidation.

**Triggers:** 2+ stops within clustering distance

**Complexity:** MEDIUM

**Typical Impact:** 5-10% per cluster

---

### 3. CHANGE_VEHICLE
Recommends downsizing when vehicle is underutilized.

**Triggers:** Weight utilization <50% AND stops <=8

**Complexity:** MEDIUM

**Typical Impact:** 15-20% fuel cost savings

---

### 4. SPLIT_ROUTE
Suggests splitting oversized routes for efficiency.

**Triggers:** Stops >12 OR (Stops >8 AND weight util >85%)

**Complexity:** HARD

**Typical Impact:** 10-15% distance reduction

---

### 5. TIME_WINDOW_OPTIMIZATION
Identifies tight early time windows for negotiation.

**Triggers:** 2+ stops with time windows before 9 AM

**Complexity:** MEDIUM

**Typical Impact:** 10-30 minutes savings

---

## Priority Levels

- **HIGH:** >15% savings or major inefficiency - implement within 1-2 days
- **MEDIUM:** 8-15% savings - implement within 1 week
- **LOW:** <8% savings - implement as convenient

## Complexity Levels

- **EASY:** <30 min, admin approval, low risk
- **MEDIUM:** 30 min-2 hrs, planner approval, medium risk
- **HARD:** 2+ hrs, management approval, high risk

## Key Formulas

### Haversine Distance
Uses great-circle distance between GPS coordinates:
- Accurate for all distances
- Returns distance in kilometers

### Fuel Calculation
- Rate: 0.08 USD/km
- Savings: `distanceKm * 0.08`

### Time Savings
- Assumed speed: 50 km/h
- Savings: `(distanceSavingKm / 50) * 60 minutes`

### ROI
- Effort cost: $50 estimate
- ROI: `(totalCostSavings / 50) * 100%`

## Integration Example

```typescript
// Fetch suggestions for specific route
async function getSuggestions(routeId: string) {
  const response = await fetch(
    `/api/routes/suggestions?routeId=${routeId}&metric=distance`
  )

  if (!response.ok) throw new Error(response.statusText)

  const data = await response.json()
  return data.suggestions
}
```

## Implementation Workflow

1. **Generate Suggestions:** Endpoint analyzes route automatically
2. **Review Suggestions:** Planner reviews recommendations
3. **Prioritize:** Start with HIGH complexity suggestions
4. **Implement:** Apply changes per suggestion steps
5. **Track Results:** Monitor actual vs estimated savings
6. **Re-analyze:** Generate new suggestions quarterly

## Performance Notes

- Single route analysis: 100-500ms response time
- Clustering algorithm: O(n²) for n stops
- Nearest neighbor: O(n²) optimization
- Bulk overview: Limited to 20 routes max

## Code Structure

### TypeScript Types

```typescript
type SuggestionType =
  | 'REORDER_STOPS'
  | 'SPLIT_ROUTE'
  | 'MERGE_ROUTES'
  | 'CHANGE_VEHICLE'
  | 'CONSOLIDATE_STOPS'
  | 'TIME_WINDOW_OPTIMIZATION'

type Priority = 'HIGH' | 'MEDIUM' | 'LOW'

type Complexity = 'EASY' | 'MEDIUM' | 'HARD'

interface RouteSuggestion {
  id: string
  type: SuggestionType
  priority: Priority
  description: string
  rationale: string
  implementation: { steps: string[]; complexity: Complexity }
  impact: {
    distanceSavingKm?: number
    distanceSavingPercent?: number
    timeSavingMinutes?: number
    fuelSavingLiters?: number
    costSavingUSD?: number
  }
  affectedStops?: string[]
}
```

### Key Functions

- `GET()` - Main handler for HTTP requests
- `calculateRouteMetrics()` - Compute route statistics
- `generateSuggestions()` - Generate all applicable suggestions
- `findClusters()` - Identify geographic clusters
- `calculateOptimalDistance()` - Use nearest-neighbor algorithm
- `calculateSavingsSummary()` - Aggregate impact metrics

## Use Cases

### Route Optimization
Plan regularly checks suggestions for all routes and implements HIGH priority improvements.

### Vehicle Fleet Management
Operations uses CHANGE_VEHICLE suggestions to optimize vehicle utilization and reduce costs.

### Time Window Negotiation
Planners use TIME_WINDOW_OPTIMIZATION to identify customers with flexible delivery windows.

### Route Splitting
For peak seasons, SPLIT_ROUTE suggestions identify which routes to split for better service.

## Best Practices

1. Review suggestions weekly
2. Prioritize by impact and complexity
3. Track implementation success
4. Communicate changes to customers
5. Re-run analysis after changes
6. Monitor actual vs projected savings

---

**Version:** 1.0
**Last Updated:** March 8, 2026
