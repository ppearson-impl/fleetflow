# Route Suggestions Endpoint - Examples & Test Cases

## Test Scenarios

### Test Case 1: Route with Inefficient Stop Sequencing

**Setup:**
- Route ID: `route_inefficient_seq`
- Stops: 10 delivery stops
- Current Distance: 65.4 km
- Optimal Distance (calculated): 45.2 km

**Request:**
```bash
curl -X GET \
  "http://localhost:3000/api/routes/suggestions?routeId=route_inefficient_seq&metric=distance" \
  -H "Cookie: session=<SESSION_TOKEN>"
```

**Expected Response:**
```json
{
  "routeId": "route_inefficient_seq",
  "metrics": {
    "stopCount": 10,
    "distanceKm": 65.4,
    "estimatedTimeMinutes": 196,
    "averageStopDistance": 6.54,
    "totalWeight": 180.5,
    "totalVolume": 8.2,
    "vehicleCapacityUtilization": {
      "weight": 0.45,
      "volume": 0.34
    }
  },
  "suggestions": [
    {
      "id": "sug_1709948400000_xyz123",
      "type": "REORDER_STOPS",
      "priority": "HIGH",
      "description": "Reorder stops using optimized sequencing algorithm",
      "rationale": "Current stop sequence appears inefficient. The route can be optimized by reordering stops to reduce travel distance from 65.4km to 45.2km.",
      "implementation": {
        "steps": [
          "Apply nearest-neighbor optimization algorithm",
          "Respect time windows where applicable",
          "Update stop sequences in system",
          "Recalculate route distance and estimated time"
        ],
        "complexity": "EASY"
      },
      "impact": {
        "distanceSavingKm": 20.2,
        "distanceSavingPercent": 30.9,
        "timeSavingMinutes": 24,
        "fuelSavingLiters": 1.6,
        "costSavingUSD": 128.00
      }
    }
  ],
  "summary": {
    "totalSavings": {
      "distanceKm": 20.2,
      "timeMinutes": 24,
      "fuelLiters": 1.6,
      "costUSD": 128.00
    },
    "potentialROI": "256% ROI on optimization effort"
  }
}
```

**Explanation:**
- Route has significant inefficiency (30.9% above optimal)
- Triggers HIGH priority REORDER_STOPS suggestion
- Easy implementation with substantial ROI
- Planner should implement within 1-2 days

---

### Test Case 2: Route with Clustered Deliveries

**Setup:**
- Route ID: `route_clustered`
- Stops: 8 stops
- Key Finding: 4 stops within 0.3 km radius at business complex

**Request:**
```bash
curl -X GET \
  "http://localhost:3000/api/routes/suggestions?routeId=route_clustered"
```

**Expected Response Excerpt:**
```json
{
  "routeId": "route_clustered",
  "suggestions": [
    {
      "id": "sug_1709948400001_abc456",
      "type": "CONSOLIDATE_STOPS",
      "priority": "MEDIUM",
      "description": "Consolidate 4 geographically close stops",
      "rationale": "4 stops are within 0.5km of each other. Consolidating these into a single stop or batch delivery could reduce handling time and travel distance.",
      "implementation": {
        "steps": [
          "Verify customer addresses for stops: stop_1, stop_2, stop_3, stop_4",
          "Determine consolidation strategy (single batch or split by customer)",
          "Update stop sequences",
          "Communicate with customers if needed"
        ],
        "complexity": "MEDIUM"
      },
      "impact": {
        "distanceSavingKm": 1.8,
        "distanceSavingPercent": 5.0,
        "timeSavingMinutes": 40
      },
      "affectedStops": ["stop_1", "stop_2", "stop_3", "stop_4"]
    }
  ]
}
```

**Expected Actions:**
- Contact 4 customers at business complex
- Offer consolidated delivery time slot
- Verify no time window conflicts
- Update route if customers agree

---

### Test Case 3: Vehicle Underutilization

**Setup:**
- Route ID: `route_oversized_vehicle`
- Vehicle: 16-ton truck (12,000 kg capacity, 45 m³)
- Current Load: 4,200 kg (35% weight), 8 m³ (17% volume)
- Stops: 6

**Request:**
```bash
curl -X GET \
  "http://localhost:3000/api/routes/suggestions?routeId=route_oversized_vehicle"
```

**Expected Response Excerpt:**
```json
{
  "routeId": "route_oversized_vehicle",
  "metrics": {
    "stopCount": 6,
    "distanceKm": 42.3,
    "vehicleCapacityUtilization": {
      "weight": 0.35,
      "volume": 0.17
    }
  },
  "suggestions": [
    {
      "id": "sug_1709948400002_def789",
      "type": "CHANGE_VEHICLE",
      "priority": "MEDIUM",
      "description": "Consider smaller vehicle to reduce operating costs",
      "rationale": "Current vehicle is 65% underutilized by weight. A smaller vehicle could service this route at lower operational cost.",
      "implementation": {
        "steps": [
          "Review available smaller vehicles",
          "Verify capacity is sufficient for all stops",
          "Update vehicle assignment",
          "Recalculate fuel consumption estimates"
        ],
        "complexity": "MEDIUM"
      },
      "impact": {
        "costSavingUSD": 8.46,
        "fuelSavingLiters": 1.06
      }
    }
  ]
}
```

**Expected Actions:**
- Review available smaller vehicles (3-ton van, 5-ton truck)
- Verify all deliveries fit in smaller vehicle
- Update vehicle assignment in system
- Monitor fuel consumption change

---

### Test Case 4: Route Splitting Opportunity

**Setup:**
- Route ID: `route_oversized`
- Stops: 18 deliveries
- Distance: 87.5 km
- Vehicle Weight Utilization: 92%

**Request:**
```bash
curl -X GET \
  "http://localhost:3000/api/routes/suggestions?routeId=route_oversized"
```

**Expected Response Excerpt:**
```json
{
  "routeId": "route_oversized",
  "suggestions": [
    {
      "id": "sug_1709948400003_ghi012",
      "type": "SPLIT_ROUTE",
      "priority": "HIGH",
      "description": "Split route into 9 and 9 stops",
      "rationale": "Route has 18 stops, which may exceed optimal driver efficiency. Splitting into two routes could improve delivery times and driver safety through reduced fatigue.",
      "implementation": {
        "steps": [
          "Create new route with 9 stops",
          "Assign second vehicle and driver",
          "Update both route plans",
          "Adjust delivery time windows if necessary",
          "Communicate changes to customers"
        ],
        "complexity": "HARD"
      },
      "impact": {
        "distanceSavingKm": 8.3,
        "distanceSavingPercent": 9.5,
        "timeSavingMinutes": 10
      }
    }
  ]
}
```

**Expected Actions:**
- Identify 9 stops for second route
- Find available vehicle and driver
- Create new route in system
- Update shipment assignments
- Notify customers of new delivery times

---

### Test Case 5: Time Window Constraints

**Setup:**
- Route ID: `route_constrained`
- Stops: 12 deliveries
- Early Time Windows: 4 stops before 9 AM
- Peak Hours Conflicts: Yes

**Request:**
```bash
curl -X GET \
  "http://localhost:3000/api/routes/suggestions?routeId=route_constrained"
```

**Expected Response Excerpt:**
```json
{
  "routeId": "route_constrained",
  "suggestions": [
    {
      "id": "sug_1709948400004_jkl345",
      "type": "TIME_WINDOW_OPTIMIZATION",
      "priority": "LOW",
      "description": "Review tight time windows for 4 stops",
      "rationale": "4 stop(s) have early time windows (before 9 AM) which may require early start times. Review with customers for flexibility to optimize overall route timing.",
      "implementation": {
        "steps": [
          "Contact customers for 4 early time window stops",
          "Request 1-2 hour window extensions if possible",
          "Recalculate optimal sequence with updated time windows",
          "Update route plan"
        ],
        "complexity": "MEDIUM"
      },
      "impact": {
        "timeSavingMinutes": 30
      }
    }
  ]
}
```

**Expected Actions:**
- Contact 4 customers with early time windows
- Negotiate flexible 1-2 hour windows
- Recalculate optimal route sequence
- Update route if customers agree

---

### Test Case 6: Bulk Route Overview

**Setup:**
- Tenant has 24 total routes
- 18 routes have optimization opportunities
- Request route overview

**Request:**
```bash
curl -X GET \
  "http://localhost:3000/api/routes/suggestions" \
  -H "Cookie: session=<SESSION_TOKEN>"
```

**Expected Response:**
```json
{
  "summary": {
    "totalRoutes": 24,
    "routesWithSuggestions": 18
  },
  "routes": [
    {
      "routeId": "route_inefficient_seq",
      "routeName": "Downtown Distribution",
      "stopCount": 10,
      "suggestionCount": 3,
      "topSuggestion": {
        "type": "REORDER_STOPS",
        "priority": "HIGH",
        "description": "Reorder stops using optimized sequencing algorithm"
      }
    },
    {
      "routeId": "route_oversized",
      "routeName": "Suburban Deliveries",
      "stopCount": 18,
      "suggestionCount": 2,
      "topSuggestion": {
        "type": "SPLIT_ROUTE",
        "priority": "HIGH",
        "description": "Split route into 9 and 9 stops"
      }
    },
    {
      "routeId": "route_clustered",
      "routeName": "CBD Deliveries",
      "stopCount": 8,
      "suggestionCount": 1,
      "topSuggestion": {
        "type": "CONSOLIDATE_STOPS",
        "priority": "MEDIUM",
        "description": "Consolidate 4 geographically close stops"
      }
    }
  ],
  "message": "Use ?routeId=<id> to get detailed suggestions for a specific route"
}
```

**Expected Actions:**
- Review top 5 routes with HIGH priority suggestions
- Implement EASY complexity suggestions first
- Schedule MEDIUM/HARD complexity changes for next planning cycle

---

## Error Test Cases

### Test Case 7: Unauthorized Request

**Request (no auth):**
```bash
curl -X GET \
  "http://localhost:3000/api/routes/suggestions?routeId=route_123"
```

**Expected Response:**
```json
{
  "error": "Unauthorized"
}
```
**Status:** 401

---

### Test Case 8: Route Not Found

**Request:**
```bash
curl -X GET \
  "http://localhost:3000/api/routes/suggestions?routeId=nonexistent_route" \
  -H "Cookie: session=<SESSION_TOKEN>"
```

**Expected Response:**
```json
{
  "error": "Route not found"
}
```
**Status:** 404

---

### Test Case 9: Missing GPS Coordinates

**Setup:**
- Route exists but has no stops with lat/lng

**Request:**
```bash
curl -X GET \
  "http://localhost:3000/api/routes/suggestions?routeId=route_no_coords" \
  -H "Cookie: session=<SESSION_TOKEN>"
```

**Expected Response:**
```json
{
  "error": "Route has no stops with valid coordinates"
}
```
**Status:** 400

---

## Integration Testing

### Scenario 1: End-to-End Route Optimization

**Step 1:** Get suggestions for route
```bash
GET /api/routes/suggestions?routeId=route_123
```

**Step 2:** Review REORDER_STOPS suggestion (HIGH priority, 30% savings)

**Step 3:** Implement in optimization endpoint
```bash
POST /api/routes/optimize
Body: { "routeId": "route_123" }
```

**Step 4:** Verify updated route
```bash
GET /api/routes/route_123
```

**Expected Outcome:**
- Distance reduced from 65.4 km to 45.8 km
- Time reduced from 196 to 137 minutes
- Sequence updated (stops reordered)

---

### Scenario 2: Multi-Route Bulk Optimization

**Step 1:** Get overview
```bash
GET /api/routes/suggestions
```

**Step 2:** Filter for HIGH priority suggestions
```
- Route 1: REORDER_STOPS (30% savings)
- Route 2: SPLIT_ROUTE (25% savings)
- Route 3: CONSOLIDATE_STOPS (10% savings)
```

**Step 3:** Implement top 3 in order
```bash
# Apply reordering
POST /api/routes/optimize (Route 1)

# Create split route
POST /api/routes (Route 2 split)

# Consolidate
POST /api/stops/consolidate (Route 3)
```

**Step 4:** Re-run suggestions
```bash
GET /api/routes/suggestions
```

**Expected Outcome:**
- 18 optimized routes → 12 routes need suggestions
- Fleet efficiency increased by 25%
- Cost savings $500-1000 monthly

---

## Performance Benchmarks

### Response Times

| Scenario | Expected Time |
|----------|---------------|
| Single route analysis (8 stops) | 150-300ms |
| Single route analysis (20 stops) | 300-600ms |
| Bulk overview (20 routes) | 400-800ms |
| Complex clustering (15 clusters) | 200-400ms |

### Data Volume

| Metric | Value |
|--------|-------|
| Average response size | 15-25 KB |
| Max suggestion per route | 6-8 |
| Average suggestions per route | 2-3 |

---

## Sample cURL Commands

### Get specific route suggestions
```bash
curl -X GET \
  "http://localhost:3000/api/routes/suggestions?routeId=route_123&metric=distance" \
  -H "Cookie: session=<YOUR_SESSION>"
```

### Get with efficiency metric
```bash
curl -X GET \
  "http://localhost:3000/api/routes/suggestions?routeId=route_456&metric=efficiency" \
  -H "Cookie: session=<YOUR_SESSION>"
```

### Get bulk overview
```bash
curl -X GET \
  "http://localhost:3000/api/routes/suggestions" \
  -H "Cookie: session=<YOUR_SESSION>"
```

### Save response to file
```bash
curl -X GET \
  "http://localhost:3000/api/routes/suggestions?routeId=route_123" \
  -H "Cookie: session=<YOUR_SESSION>" \
  -o suggestions.json
```

---

## Troubleshooting

### Issue: No suggestions returned
**Possible Causes:**
- Route is already optimized
- Insufficient stops (< 4)
- All stops within time windows
- Vehicle perfectly utilized

**Resolution:** Check metrics to verify route is near-optimal

### Issue: High number of suggestions
**Possible Causes:**
- Route is significantly inefficient
- Multiple optimization opportunities exist
- Recent route changes

**Resolution:** Prioritize by HIGH impact first, implement in phases

### Issue: Slow response time
**Possible Causes:**
- Large number of stops (>50)
- Complex clustering scenario
- Database performance

**Resolution:** Cache results, limit to top 20 routes in bulk mode

---

**Last Updated:** March 8, 2026
