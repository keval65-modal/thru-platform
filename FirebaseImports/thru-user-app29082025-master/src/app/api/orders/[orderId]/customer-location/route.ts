import { NextResponse } from "next/server"
import { z } from "zod"

import { createServiceSupabaseClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/types"
import {
  buildTravelTrackingPatch,
  type TrackingRowFields,
  type TravelRouteSnapshot,
} from "@/lib/tracking/customer-travel-eta-engine"
import { qualifiesForLiveLocationPing } from "@/lib/tracking/order-live-location-gate"

const BodySchema = z.object({
  latitude: z.number().finite().gte(-90).lte(90),
  longitude: z.number().finite().gte(-180).lte(180),
  accuracy: z.number().finite().nonnegative().optional(),
  recordedAt: z.string().optional(),
  speedMps: z.number().finite().nonnegative().nullable().optional(),
  heading: z.number().finite().nullable().optional(),
})

type PlacedOrderRow = Database["public"]["Tables"]["placed_orders"]["Row"]

function vendorPortionsFromJson(raw: unknown): Array<{ status?: string }> {
  if (!Array.isArray(raw)) return []
  return raw.map((p) => {
    if (p && typeof p === "object" && "status" in p) {
      return { status: String((p as { status: unknown }).status) }
    }
    return {}
  })
}

function rowToTrackingFields(row: PlacedOrderRow): TrackingRowFields {
  const raw = row.customer_travel_route_json
  let route: TravelRouteSnapshot | null = null
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>
    if (
      typeof o.distanceMeters === "number" &&
      typeof o.durationSeconds === "number" &&
      typeof o.durationInTrafficSeconds === "number" &&
      typeof o.fetchedAt === "string"
    ) {
      route = {
        distanceMeters: o.distanceMeters,
        durationSeconds: o.durationSeconds,
        durationInTrafficSeconds: o.durationInTrafficSeconds,
        fetchedAt: o.fetchedAt,
      }
    }
  }
  return {
    current_latitude: row.current_latitude,
    current_longitude: row.current_longitude,
    last_polled_at: row.last_polled_at,
    last_eta_refresh_at: row.last_eta_refresh_at,
    last_eta_refresh_latitude: row.last_eta_refresh_latitude,
    last_eta_refresh_longitude: row.last_eta_refresh_longitude,
    current_eta_minutes: row.current_eta_minutes,
    current_eta_range: row.current_eta_range,
    arrival_radius_entered: row.arrival_radius_entered,
    arrival_radius_entered_at: row.arrival_radius_entered_at,
    manually_confirmed_travel: row.manually_confirmed_travel,
    customer_travel_route_json: route,
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params
    if (!orderId) {
      return NextResponse.json({ success: false, error: "Missing order id" }, { status: 400 })
    }

    const json = await request.json()
    const body = BodySchema.parse(json)

    const supabase = createServiceSupabaseClient()

    const { data: row, error: fetchError } = await supabase
      .from("placed_orders")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle()

    if (fetchError) {
      console.error("[customer-location] fetch", fetchError)
      return NextResponse.json(
        { success: false, error: fetchError.message ?? "Lookup failed" },
        { status: 500 }
      )
    }

    if (!row) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 })
    }

    const portions = vendorPortionsFromJson(row.vendor_portions)
    if (
      !qualifiesForLiveLocationPing({
        overallStatus: row.overall_status,
        paymentStatus: row.payment_status,
        vendorPortions: portions,
      })
    ) {
      return NextResponse.json(
        { success: false, error: "Live location not accepted for this order state" },
        { status: 403 }
      )
    }

    const recordedAt = body.recordedAt ?? new Date().toISOString()
    const nowMs = Date.now()

    const patch = await buildTravelTrackingPatch({
      row: rowToTrackingFields(row),
      vendorPortionsJson: row.vendor_portions,
      ping: {
        latitude: body.latitude,
        longitude: body.longitude,
        accuracy: body.accuracy,
        speedMps: body.speedMps ?? null,
        recordedAtIso: recordedAt,
        nowMs,
      },
    })

    const { error: updateError } = await supabase
      .from("placed_orders")
      .update(patch)
      .eq("order_id", orderId)

    if (updateError) {
      console.error("[customer-location] update", updateError)
      return NextResponse.json(
        { success: false, error: updateError.message ?? "Update failed" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      etaMinutes: typeof patch.current_eta_minutes === "number" ? patch.current_eta_minutes : null,
      etaRange: typeof patch.current_eta_range === "string" ? patch.current_eta_range : null,
      trackingStatus:
        typeof patch.customer_tracking_status === "string" ? patch.customer_tracking_status : null,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    console.error("[customer-location] unexpected", error)
    const message = error instanceof Error ? error.message : "Unexpected error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
