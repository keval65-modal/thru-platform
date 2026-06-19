import { NextRequest, NextResponse } from "next/server";

import { createServiceSupabaseClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { orderId } = await context.params;

  if (!orderId) {
    return NextResponse.json({ success: false, error: "orderId is required" }, { status: 400 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    const reason = body.reason?.trim() || "Cancelled by customer";
    const cancelledAt = new Date().toISOString();
    const supabase = createServiceSupabaseClient();

    const { data: order, error: fetchError } = await supabase
      .from("placed_orders")
      .select("customer_info, vendor_portions")
      .eq("order_id", orderId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json(
        { success: false, error: fetchError?.message || "Order not found" },
        { status: 404 }
      );
    }

    const vendorPortions = Array.isArray(order.vendor_portions) ? order.vendor_portions : [];
    const updatedVendorPortions = vendorPortions.map((portion: any) => ({
      ...portion,
      status: "Cancelled",
      rejectionReason: reason,
    }));

    const { error: updateError } = await supabase
      .from("placed_orders")
      .update({
        overall_status: "Cancelled",
        vendor_portions: updatedVendorPortions,
        customer_info: {
          ...(order.customer_info || {}),
          cancellation: {
            reason,
            cancelledAt,
            cancelledBy: "customer",
          },
        },
      })
      .eq("order_id", orderId);

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to cancel order";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
