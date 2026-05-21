import { NextResponse } from "next/server"

import { createServiceSupabaseClient } from "@/lib/supabase/server"
import { qualifiesForPickupTravelActions } from "@/lib/tracking/order-live-location-gate"

export async function POST(
  _request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params
    if (!orderId) {
      return NextResponse.json({ success: false, error: "Missing order id" }, { status: 400 })
    }

    const supabase = createServiceSupabaseClient()
    const { data: row, error: fetchError } = await supabase
      .from("placed_orders")
      .select("order_id, overall_status, payment_status")
      .eq("order_id", orderId)
      .maybeSingle()

    if (fetchError) {
      console.error("[travel-confirm] fetch", fetchError)
      return NextResponse.json(
        { success: false, error: fetchError.message ?? "Lookup failed" },
        { status: 500 }
      )
    }

    if (!row) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 })
    }

    if (
      !qualifiesForPickupTravelActions({
        overallStatus: row.overall_status,
        paymentStatus: row.payment_status,
      })
    ) {
      return NextResponse.json(
        { success: false, error: "Travel confirmation not allowed for this order state" },
        { status: 403 }
      )
    }

    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from("placed_orders")
      .update({
        manually_confirmed_travel: true,
        updated_at: now,
      })
      .eq("order_id", orderId)

    if (updateError) {
      console.error("[travel-confirm] update", updateError)
      return NextResponse.json(
        { success: false, error: updateError.message ?? "Update failed" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[travel-confirm] unexpected", error)
    const message = error instanceof Error ? error.message : "Unexpected error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
