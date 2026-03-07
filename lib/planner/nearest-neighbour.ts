export interface PlannerStop {
  id: string
  lat: number
  lng: number
  shipmentId: string
  location: string
  timeWindowStart?: Date | null
  timeWindowEnd?: Date | null
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

export function nearestNeighbour(
  stops: PlannerStop[],
  depotLat = 51.5074,
  depotLng = -0.1278
): PlannerStop[] {
  if (stops.length === 0) return []

  const unvisited = [...stops]
  const ordered: PlannerStop[] = []
  let curLat = depotLat
  let curLng = depotLng

  while (unvisited.length > 0) {
    let nearest = 0
    let nearestDist = Infinity

    for (let i = 0; i < unvisited.length; i++) {
      const s = unvisited[i]
      const d = haversineKm(curLat, curLng, s.lat, s.lng)
      if (d < nearestDist) {
        nearestDist = d
        nearest = i
      }
    }

    const next = unvisited.splice(nearest, 1)[0]
    ordered.push(next)
    curLat = next.lat
    curLng = next.lng
  }

  return ordered
}

export function estimateRouteDistance(stops: PlannerStop[], depotLat = 51.5074, depotLng = -0.1278): number {
  if (stops.length === 0) return 0
  let dist = haversineKm(depotLat, depotLng, stops[0].lat, stops[0].lng)
  for (let i = 1; i < stops.length; i++) {
    dist += haversineKm(stops[i - 1].lat, stops[i - 1].lng, stops[i].lat, stops[i].lng)
  }
  // Return to depot
  dist += haversineKm(stops[stops.length - 1].lat, stops[stops.length - 1].lng, depotLat, depotLng)
  return Math.round(dist * 10) / 10
}
