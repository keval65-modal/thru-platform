/**
 * Server-only ETA / arrival logic for customer travel tracking.
 * Called from POST /api/orders/[orderId]/customer-location — keep Google calls rate-limited here.
 */

export const DEFAULT_ARRIVAL_RADIUS_METERS = 300
export const ETA_REFRESH_DISTANCE_METERS = 100
export const ETA_REFRESH_INTERVAL_MS = 60_000
/** Minimum assumed speed (m/s) for internal ETA when GPS speed is missing or too low. */
const MIN_ASSUMED_SPEED_MPS = 2

export type VendorLatLng = { lat: number; lng: number }

export type TravelRouteSnapshot = {
  distanceMeters: number
  durationSeconds: number
  durationInTrafficSeconds: number
  fetchedAt: string
}

export type TrackingRowFields = {
  current_latitude: number | null
  current_longitude: number | null
  last_polled_at: string | null
  last_eta_refresh_at: string | null
  last_eta_refresh_latitude: number | null
  last_eta_refresh_longitude: number | null
  current_eta_minutes: number | null
  current_eta_range: string | null
  arrival_radius_entered: boolean | null
  arrival_radius_entered_at: string | null
  manually_confirmed_travel: boolean | null
  customer_travel_route_json: TravelRouteSnapshot | null
}

export function haversineMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const R = 6371000
  const φ1 = (aLat * Math.PI) / 180
  const φ2 = (bLat * Math.PI) / 180
  const Δφ = ((bLat - aLat) * Math.PI) / 180
  const Δλ = ((bLng - aLng) * Math.PI) / 180
  const s =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
  return R * c
}

/** User-facing bands aligned with product examples. */
export function formatFriendlyEtaRange(etaMinutes: number): string {
  const m = Math.max(1, Math.round(etaMinutes))
  if (m <= 5) return "3-5 mins"
  if (m <= 10) return "5-10 mins"
  return "10+ mins"
}

export function getPrimaryVendorLatLng(portions: unknown): VendorLatLng | null {
  if (!Array.isArray(portions)) return null
  for (const p of portions) {
    if (!p || typeof p !== "object") continue
    const loc = (p as { vendorLocation?: { latitude?: number; longitude?: number } })
      .vendorLocation
    if (
      loc &&
      typeof loc.latitude === "number" &&
      typeof loc.longitude === "number" &&
      Number.isFinite(loc.latitude) &&
      Number.isFinite(loc.longitude)
    ) {
      return { lat: loc.latitude, lng: loc.longitude }
    }
  }
  return null
}

async function fetchDistanceMatrixTraffic(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  apiKey: string
): Promise<TravelRouteSnapshot | null> {
  const origins = `${originLat},${originLng}`
  const destinations = `${destLat},${destLng}`
  const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json")
  url.searchParams.set("origins", origins)
  url.searchParams.set("destinations", destinations)
  url.searchParams.set("mode", "driving")
  url.searchParams.set("departure_time", "now")
  url.searchParams.set("traffic_model", "best_guess")
  url.searchParams.set("key", apiKey)

  const res = await fetch(url.toString(), { next: { revalidate: 0 } })
  if (!res.ok) {
    console.warn("[travel-eta] Distance Matrix HTTP", res.status)
    return null
  }
  const data = (await res.json()) as {
    status: string
    rows?: Array<{
      elements?: Array<{
        status: string
        distance?: { value: number }
        duration?: { value: number }
        duration_in_traffic?: { value: number }
      }>
    }>
  }
  if (data.status !== "OK" || !data.rows?.[0]?.elements?.[0]) {
    console.warn("[travel-eta] Distance Matrix status", data.status)
    return null
  }
  const el = data.rows[0].elements[0]
  if (el.status !== "OK" || !el.distance?.value || !el.duration?.value) {
    return null
  }
  const traffic = el.duration_in_traffic?.value ?? el.duration.value
  return {
    distanceMeters: el.distance.value,
    durationSeconds: el.duration.value,
    durationInTrafficSeconds: traffic,
    fetchedAt: new Date().toISOString(),
  }
}

export function resolveGoogleMapsServerKey(): string | undefined {
  return (
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.DISTANCE_MATRIX_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    undefined
  )
}

export type LocationPingInput = {
  latitude: number
  longitude: number
  accuracy?: number
  speedMps?: number | null
  recordedAtIso: string
  nowMs: number
  arrivalRadiusMeters?: number
}

/**
 * Builds Supabase patch for travel columns (+ mirrors customer_live_* for backwards compatibility).
 */
export async function buildTravelTrackingPatch(args: {
  row: TrackingRowFields
  vendorPortionsJson: unknown
  ping: LocationPingInput
}): Promise<Record<string, unknown>> {
  const { row, vendorPortionsJson, ping } = args
  const arrivalRadius = ping.arrivalRadiusMeters ?? DEFAULT_ARRIVAL_RADIUS_METERS
  const vendor = getPrimaryVendorLatLng(vendorPortionsJson)

  const nowIso = new Date(ping.nowMs).toISOString()

  const patch: Record<string, unknown> = {
    current_latitude: ping.latitude,
    current_longitude: ping.longitude,
    last_polled_at: nowIso,
    customer_live_lat: ping.latitude,
    customer_live_lng: ping.longitude,
    customer_live_accuracy: ping.accuracy ?? null,
    customer_live_updated_at: ping.recordedAtIso,
    updated_at: nowIso,
  }

  // —— Arrival radius (first entry only) ——
  if (vendor && !row.arrival_radius_entered) {
    const d = haversineMeters(ping.latitude, ping.longitude, vendor.lat, vendor.lng)
    if (d <= arrivalRadius) {
      patch.arrival_radius_entered = true
      patch.arrival_radius_entered_at = nowIso
      patch.customer_tracking_status = "Arriving"
    }
  }

  if (!vendor) {
    return patch
  }

  const remainingDirect = haversineMeters(
    ping.latitude,
    ping.longitude,
    vendor.lat,
    vendor.lng
  )

  let speedMps = ping.speedMps
  if (
    (speedMps == null || !Number.isFinite(speedMps) || speedMps < 0.5) &&
    row.current_latitude != null &&
    row.current_longitude != null &&
    row.last_polled_at
  ) {
    const prevT = new Date(row.last_polled_at).getTime()
    const dt = (ping.nowMs - prevT) / 1000
    if (dt > 0.5) {
      const moved = haversineMeters(
        row.current_latitude,
        row.current_longitude,
        ping.latitude,
        ping.longitude
      )
      const derived = moved / dt
      if (Number.isFinite(derived) && derived >= 0.5) {
        speedMps = derived
      }
    }
  }

  const lastRefreshMs = row.last_eta_refresh_at
    ? new Date(row.last_eta_refresh_at).getTime()
    : 0
  const movedSinceRefresh =
    row.last_eta_refresh_latitude != null && row.last_eta_refresh_longitude != null
      ? haversineMeters(
          ping.latitude,
          ping.longitude,
          row.last_eta_refresh_latitude,
          row.last_eta_refresh_longitude
        )
      : Infinity

  const needsGoogleRefresh =
    !row.last_eta_refresh_at ||
    movedSinceRefresh > ETA_REFRESH_DISTANCE_METERS ||
    ping.nowMs - lastRefreshMs > ETA_REFRESH_INTERVAL_MS

  const apiKey = resolveGoogleMapsServerKey()

  if (needsGoogleRefresh && apiKey) {
    try {
      const snap = await fetchDistanceMatrixTraffic(
        ping.latitude,
        ping.longitude,
        vendor.lat,
        vendor.lng,
        apiKey
      )
      if (snap) {
        const minsTraffic = Math.max(1, Math.round(snap.durationInTrafficSeconds / 60))
        patch.last_eta_refresh_at = nowIso
        patch.last_eta_refresh_latitude = ping.latitude
        patch.last_eta_refresh_longitude = ping.longitude
        patch.current_eta_minutes = minsTraffic
        patch.current_eta_range = formatFriendlyEtaRange(minsTraffic)
        patch.customer_travel_route_json = snap
      }
    } catch (e) {
      console.warn("[travel-eta] Google refresh failed", e)
    }
  }

  if (!needsGoogleRefresh || patch.current_eta_minutes == null) {
    const effectiveSpeed = Math.max(
      speedMps != null && Number.isFinite(speedMps) ? speedMps : 0,
      MIN_ASSUMED_SPEED_MPS
    )
    const etaSeconds = remainingDirect / effectiveSpeed
    const mins = Math.max(1, Math.round(etaSeconds / 60))
    patch.current_eta_minutes = mins
    patch.current_eta_range = formatFriendlyEtaRange(mins)
  }

  return patch
}
