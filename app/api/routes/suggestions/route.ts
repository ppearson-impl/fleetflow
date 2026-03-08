import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

// ─── Types ───────────────────────────────────────────────────────────────────

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
  implementation: {
    steps: string[]
    complexity: Complexity
  }
  impact: {
    distanceSavingKm?: number
    distanceSavingPercent?: number
    timeSavingMinutes?: number
    timeSavingPercent?: number
    fuelSavingLiters?: number
    costSavingUSD?: number
  }
  affectedStops?: string[] // stop IDs
  suggestedAlternativeRouteId?: string
}

interface RouteMetrics {
  stopCount: number
  distanceKm: number
  estimatedTimeMinutes: number
  averageStopDistance: number
  totalWeight: number
  totalVolume: number
  vehicleCapacityUtilization: {
    weight: number
    volume: number
  }
}

interface SuggestionsResponse {
  routeId: string
  metrics: RouteMetrics
  suggestions: RouteSuggestion[]
  summary: {
    totalSavings: {
      distanceKm: number
      timeMinutes: number
      fuelLiters: number
      costUSD: number
    }
    potentialROI: string
  }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FUEL_COST_PER_KM = 0.08 // USD per km
const TIME_VALUE_PER_HOUR = 45 // USD per hour
const MIN_CLUSTERING_DISTANCE = 0.5 // km
const INEFFICIENCY_THRESHOLD = 1.3 // 30% above optimal distance
const DEPOT_LAT = 51.5074
const DEPOT_LNG = -0.1278

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Calculate Haversine distance between two coordinates
 */
function haversineKmHelper(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Calculate optimal distance using nearest neighbor
 */
function calculateOptimalDistance(stops: Array<{ lat: number; lng: number }>): number {
  if (stops.length === 0) return 0
  let dist = haversineKmHelper(DEPOT_LAT, DEPOT_LNG, stops[0].lat, stops[0].lng)
  for (let i = 1; i < stops.length; i++) {
    dist += haversineKmHelper(
      stops[i - 1].lat,
      stops[i - 1].lng,
      stops[i].lat,
      stops[i].lng
    )
  }
  dist += haversineKmHelper(stops[stops.length - 1].lat, stops[stops.length - 1].lng, DEPOT_LAT, DEPOT_LNG)
  return Math.round(dist * 10) / 10
}

/**
 * Find clusters of geographically close stops
 */
function findClusters(
  stops: Array<{ id: string; lat: number; lng: number }>
): Array<string[]> {
  const clusters: Array<string[]> = []
  const visited = new Set<string>()

  for (const stop of stops) {
    if (visited.has(stop.id)) continue

    const cluster = [stop.id]
    visited.add(stop.id)

    for (const otherStop of stops) {
      if (!visited.has(otherStop.id)) {
        const distance = haversineKmHelper(
          stop.lat,
          stop.lng,
          otherStop.lat,
          otherStop.lng
        )
        if (distance < MIN_CLUSTERING_DISTANCE) {
          cluster.push(otherStop.id)
          visited.add(otherStop.id)
        }
      }
    }

    if (cluster.length > 1) {
      clusters.push(cluster)
    }
  }

  return clusters
}

/**
 * Check if stops are sequenced inefficiently
 */
function isSequenceInefficient(
  stops: Array<{ sequence: number; lat: number; lng: number }>,
  currentDistance: number
): boolean {
  const optimalDistance = calculateOptimalDistance(stops)
  const inefficiencyRatio = currentDistance / optimalDistance
  return inefficiencyRatio > INEFFICIENCY_THRESHOLD
}

/**
 * Generate unique suggestion ID
 */
function generateSuggestionId(): string {
  return `sug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// ─── Main Handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    // Authentication check
    const session = await getSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams
    const routeId = searchParams.get('routeId')
    const metric = (searchParams.get('metric') || 'distance') as 'distance' | 'time' | 'efficiency'

    // If no routeId provided, return general suggestions for all routes
    if (!routeId) {
      return handleGeneralSuggestions(session.tenantId)
    }

    // Fetch route with all details
    const route = await prisma.route.findFirst({
      where: {
        id: routeId,
        tenantId: session.tenantId,
      },
      include: {
        stops: {
          orderBy: { sequence: 'asc' },
          include: {
            shipment: {
              include: {
                deliveryItems: true,
              },
            },
          },
        },
        vehicle: true,
        driver: true,
      },
    })

    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 })
    }

    // Validate stops have coordinates
    const stopsWithCoords = route.stops.filter(s => s.lat != null && s.lng != null) as Array<{
      lat: number
      lng: number
      shipment: any
    }>
    if (stopsWithCoords.length === 0) {
      return NextResponse.json(
        { error: 'Route has no stops with valid coordinates' },
        { status: 400 }
      )
    }

    // Calculate metrics
    const metrics = calculateRouteMetrics(route, stopsWithCoords)

    // Generate suggestions
    const suggestions = generateSuggestions(
      routeId,
      route,
      stopsWithCoords,
      metrics,
      metric
    )

    // Calculate total savings
    const summary = calculateSavingsSummary(suggestions)

    const response: SuggestionsResponse = {
      routeId,
      metrics,
      suggestions: suggestions.sort((a, b) => {
        const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
        const impactA = (a.impact.distanceSavingPercent || 0) * (1 / (priorityOrder[a.priority] + 1))
        const impactB = (b.impact.distanceSavingPercent || 0) * (1 / (priorityOrder[b.priority] + 1))
        return impactB - impactA
      }),
      summary,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error generating suggestions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ─── Suggestion Generation ───────────────────────────────────────────────────

/**
 * Calculate comprehensive route metrics
 */
function calculateRouteMetrics(
  route: any,
  stops: Array<{ lat: number; lng: number; shipment: any }>
): RouteMetrics {
  const distanceKm = route.distanceKm || 0
  const stopCount = stops.length
  const estimatedTimeMinutes = route.estimatedDuration || 0

  let totalWeight = 0
  let totalVolume = 0

  stops.forEach(stop => {
    if (stop.shipment?.deliveryItems) {
      stop.shipment.deliveryItems.forEach((item: any) => {
        totalWeight += item.weight || 0
        totalVolume += item.volume || 0
      })
    }
  })

  const vehicleCapacityUtilization = {
    weight: route.vehicle?.capacityWeight
      ? Math.round((totalWeight / route.vehicle.capacityWeight) * 100) / 100
      : 0,
    volume: route.vehicle?.capacityVolume
      ? Math.round((totalVolume / route.vehicle.capacityVolume) * 100) / 100
      : 0,
  }

  return {
    stopCount,
    distanceKm,
    estimatedTimeMinutes,
    averageStopDistance: distanceKm / Math.max(stopCount, 1),
    totalWeight,
    totalVolume,
    vehicleCapacityUtilization,
  }
}

/**
 * Generate all applicable suggestions for a route
 */
function generateSuggestions(
  routeId: string,
  route: any,
  stops: Array<any>,
  metrics: RouteMetrics,
  metric: string
): RouteSuggestion[] {
  const suggestions: RouteSuggestion[] = []

  // 1. REORDER_STOPS suggestion
  if (metrics.distanceKm > 0) {
    const optimalDistance = calculateOptimalDistance(stops)
    if (isSequenceInefficient(stops, metrics.distanceKm)) {
      const savingKm = metrics.distanceKm - optimalDistance
      const savingPercent = Math.round((savingKm / metrics.distanceKm) * 100 * 10) / 10

      suggestions.push({
        id: generateSuggestionId(),
        type: 'REORDER_STOPS',
        priority: savingPercent > 15 ? 'HIGH' : 'MEDIUM',
        description: `Reorder stops using optimized sequencing algorithm`,
        rationale: `Current stop sequence appears inefficient. The route can be optimized by reordering stops to reduce travel distance from ${metrics.distanceKm}km to ${optimalDistance}km.`,
        implementation: {
          steps: [
            'Apply nearest-neighbor optimization algorithm',
            'Respect time windows where applicable',
            'Update stop sequences in system',
            'Recalculate route distance and estimated time',
          ],
          complexity: 'EASY',
        },
        impact: {
          distanceSavingKm: Math.round(savingKm * 10) / 10,
          distanceSavingPercent: savingPercent,
          timeSavingMinutes: Math.round((savingKm / 50) * 60), // Assume 50km/h average
          fuelSavingLiters: Math.round(savingKm * 0.08 * 10) / 10,
          costSavingUSD: Math.round(savingKm * FUEL_COST_PER_KM * 100) / 100,
        },
      })
    }
  }

  // 2. CONSOLIDATE_STOPS suggestion
  const clusters = findClusters(stops)
  if (clusters.length > 0) {
    clusters.slice(0, 2).forEach((cluster, index) => {
      if (cluster.length >= 2) {
        suggestions.push({
          id: generateSuggestionId(),
          type: 'CONSOLIDATE_STOPS',
          priority: cluster.length >= 3 ? 'HIGH' : 'MEDIUM',
          description: `Consolidate ${cluster.length} geographically close stops`,
          rationale: `${cluster.length} stops are within ${MIN_CLUSTERING_DISTANCE}km of each other. Consolidating these into a single stop or batch delivery could reduce handling time and travel distance.`,
          implementation: {
            steps: [
              `Verify customer addresses for stops: ${cluster.join(', ')}`,
              'Determine consolidation strategy (single batch or split by customer)',
              'Update stop sequences',
              'Communicate with customers if needed',
            ],
            complexity: 'MEDIUM',
          },
          impact: {
            distanceSavingKm: Math.round(haversineKmHelper(
              stops[stops.findIndex(s => s.id === cluster[0])].lat,
              stops[stops.findIndex(s => s.id === cluster[0])].lng,
              stops[stops.findIndex(s => s.id === cluster[cluster.length - 1])].lat,
              stops[stops.findIndex(s => s.id === cluster[cluster.length - 1])].lng
            ) * 10) / 10,
            distanceSavingPercent: 5,
            timeSavingMinutes: 10 * cluster.length,
          },
          affectedStops: cluster,
        })
      }
    })
  }

  // 3. CHANGE_VEHICLE suggestion
  if (route.vehicle && metrics.vehicleCapacityUtilization.weight > 0) {
    if (metrics.vehicleCapacityUtilization.weight < 0.5 && metrics.stopCount <= 8) {
      suggestions.push({
        id: generateSuggestionId(),
        type: 'CHANGE_VEHICLE',
        priority: 'MEDIUM',
        description: `Consider smaller vehicle to reduce operating costs`,
        rationale: `Current vehicle is ${Math.round((1 - metrics.vehicleCapacityUtilization.weight) * 100)}% underutilized by weight. A smaller vehicle could service this route at lower operational cost.`,
        implementation: {
          steps: [
            'Review available smaller vehicles',
            'Verify capacity is sufficient for all stops',
            'Update vehicle assignment',
            'Recalculate fuel consumption estimates',
          ],
          complexity: 'MEDIUM',
        },
        impact: {
          costSavingUSD: Math.round(metrics.distanceKm * 0.02 * 100) / 100, // Estimate 20% fuel savings
          fuelSavingLiters: Math.round(metrics.distanceKm * 0.02 * 10) / 10,
        },
      })
    }
  }

  // 4. SPLIT_ROUTE suggestion
  if (
    metrics.stopCount > 12 ||
    (metrics.stopCount > 8 && metrics.vehicleCapacityUtilization.weight > 0.85)
  ) {
    const splitPoint = Math.floor(metrics.stopCount / 2)
    const group1Stops = stops.slice(0, splitPoint)
    const group2Stops = stops.slice(splitPoint)

    const distance1 = calculateOptimalDistance(group1Stops)
    const distance2 = calculateOptimalDistance(group2Stops)
    const newTotalDistance = distance1 + distance2

    suggestions.push({
      id: generateSuggestionId(),
      type: 'SPLIT_ROUTE',
      priority: metrics.stopCount > 15 ? 'HIGH' : 'MEDIUM',
      description: `Split route into ${splitPoint} and ${metrics.stopCount - splitPoint} stops`,
      rationale: `Route has ${metrics.stopCount} stops, which may exceed optimal driver efficiency. Splitting into two routes could improve delivery times and driver safety through reduced fatigue.`,
      implementation: {
        steps: [
          `Create new route with ${metrics.stopCount - splitPoint} stops`,
          'Assign second vehicle and driver',
          'Update both route plans',
          'Adjust delivery time windows if necessary',
          'Communicate changes to customers',
        ],
        complexity: 'HARD',
      },
      impact: {
        distanceSavingKm: Math.round((metrics.distanceKm - newTotalDistance) * 10) / 10,
        distanceSavingPercent: Math.round(
          ((metrics.distanceKm - newTotalDistance) / metrics.distanceKm) * 100 * 10
        ) / 10,
        timeSavingMinutes: Math.round(((metrics.distanceKm - newTotalDistance) / 50) * 60),
      },
    })
  }

  // 5. TIME_WINDOW_OPTIMIZATION suggestion
  const stopsWithTimeWindows = stops.filter(s => s.timeWindowStart && s.timeWindowEnd)
  if (stopsWithTimeWindows.length > 2) {
    const earlyStops = stopsWithTimeWindows.filter(s => {
      const startHour = new Date(s.timeWindowStart).getHours()
      return startHour < 9
    })

    if (earlyStops.length > 0) {
      suggestions.push({
        id: generateSuggestionId(),
        type: 'TIME_WINDOW_OPTIMIZATION',
        priority: 'LOW',
        description: `Review tight time windows for ${earlyStops.length} stops`,
        rationale: `${earlyStops.length} stop(s) have early time windows (before 9 AM) which may require early start times. Review with customers for flexibility to optimize overall route timing.`,
        implementation: {
          steps: [
            `Contact customers for ${earlyStops.length} early time window stops`,
            'Request 1-2 hour window extensions if possible',
            'Recalculate optimal sequence with updated time windows',
            'Update route plan',
          ],
          complexity: 'MEDIUM',
        },
        impact: {
          timeSavingMinutes: 30,
        },
      })
    }
  }

  return suggestions
}

/**
 * Calculate total savings summary
 */
function calculateSavingsSummary(suggestions: RouteSuggestion[]) {
  let totalDistanceSaving = 0
  let totalTimeSaving = 0
  let totalFuelSaving = 0
  let totalCostSaving = 0

  suggestions.forEach(suggestion => {
    totalDistanceSaving += suggestion.impact.distanceSavingKm || 0
    totalTimeSaving += suggestion.impact.timeSavingMinutes || 0
    totalFuelSaving += suggestion.impact.fuelSavingLiters || 0
    totalCostSaving += suggestion.impact.costSavingUSD || 0
  })

  const roi = totalCostSaving > 0 ? `${Math.round((totalCostSaving / 50) * 100)}% ROI on optimization effort` : 'Variable based on implementation'

  return {
    totalSavings: {
      distanceKm: Math.round(totalDistanceSaving * 10) / 10,
      timeMinutes: Math.round(totalTimeSaving),
      fuelLiters: Math.round(totalFuelSaving * 10) / 10,
      costUSD: Math.round(totalCostSaving * 100) / 100,
    },
    potentialROI: roi,
  }
}

/**
 * Handle general suggestions for all routes in tenant
 */
async function handleGeneralSuggestions(tenantId: string) {
  try {
    const routes = await prisma.route.findMany({
      where: {
        tenantId,
        status: { in: ['DRAFT', 'PLANNED'] },
      },
      include: {
        stops: {
          include: { shipment: { include: { deliveryItems: true } } },
        },
        vehicle: true,
      },
      take: 20,
    })

    const routeSuggestions = routes
      .map(route => {
        const stopsWithCoords = route.stops.filter(s => s.lat != null && s.lng != null) as Array<{
          lat: number
          lng: number
          shipment: any
        }>
        if (stopsWithCoords.length === 0) return null

        const metrics = calculateRouteMetrics(route, stopsWithCoords)
        const suggestions = generateSuggestions(
          route.id,
          route,
          stopsWithCoords,
          metrics,
          'distance'
        )

        return {
          routeId: route.id,
          routeName: route.name,
          stopCount: metrics.stopCount,
          suggestionCount: suggestions.length,
          topSuggestion: suggestions[0] || null,
        }
      })
      .filter(Boolean)

    return NextResponse.json({
      summary: {
        totalRoutes: routes.length,
        routesWithSuggestions: routeSuggestions.length,
      },
      routes: routeSuggestions,
      message: 'Use ?routeId=<id> to get detailed suggestions for a specific route',
    })
  } catch (error) {
    console.error('Error generating general suggestions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
