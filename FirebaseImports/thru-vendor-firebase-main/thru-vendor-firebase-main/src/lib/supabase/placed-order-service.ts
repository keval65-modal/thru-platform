/**
 * Placed Order Service - Supabase Version (Vendor App)
 * Handles order operations for vendors using Supabase PostgreSQL
 */

import { getSupabaseClient } from './client';
import { createServiceSupabaseClient } from './server';
import type { PlacedOrder, VendorDisplayOrder, VendorOrderPortion, OrderItemDetail } from '@/lib/orderModels';

export class SupabasePlacedOrderService {
  /**
   * Get orders for a specific vendor.
   * Options can filter by status and limit the number of results.
   */
  static async getVendorOrders(
    vendorId: string,
    options?: { status?: string[]; limit?: number }
  ): Promise<VendorDisplayOrder[]> {
    try {
      const supabase = getSupabaseClient();
      let query = supabase
        .from('placed_orders')
        .select('*')
        .contains('vendor_ids', [vendorId])
        .order('created_at', { ascending: false });

      if (options?.status && options.status.length > 0) {
        query = query.in('overall_status', options.status);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((order) => this.mapToVendorDisplayOrder(order, vendorId));
    } catch (error) {
      console.error('Error fetching vendor orders:', error);
      return [];
    }
  }

  /**
   * Get a single order by its ID.
   */
  static async getOrder(orderId: string): Promise<PlacedOrder | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('placed_orders')
        .select('*')
        .eq('order_id', orderId)
        .single();
      if (error) {
        console.warn(`Order ${orderId} not found.`);
        return null;
      }
      return data as PlacedOrder;
    } catch (error) {
      console.error('Error fetching order:', error);
      return null;
    }
  }

  /**
   * Update the status (and optionally prepTime) of a vendor's portion of an order.
   */
  static async updateVendorPortionStatus(
    orderId: string,
    vendorId: string,
    status: string,
    prepTime?: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createServiceSupabaseClient();
      const { data: order, error: fetchError } = await supabase
        .from('placed_orders')
        .select('*')
        .eq('order_id', orderId)
        .single();
      if (fetchError) throw fetchError;

      const updatedPortions = (order.vendor_portions as any[]).map((portion) => {
        if (portion.vendorId === vendorId) {
          return {
            ...portion,
            status,
            ...(prepTime !== undefined && { prepTime })
          };
        }
        return portion;
      });

      // Determine overall status based on all portions
      let overallStatus = order.overall_status;
      const allReady = updatedPortions.every((p: any) => p.status === 'Ready for Pickup');
      const anyPreparing = updatedPortions.some((p: any) => p.status === 'Preparing');
      if (allReady) {
        overallStatus = 'Ready for Pickup';
      } else if (anyPreparing) {
        overallStatus = 'In Progress';
      }

      const { error: updateError } = await supabase
        .from('placed_orders')
        .update({
          vendor_portions: updatedPortions,
          overall_status: overallStatus
        })
        .eq('order_id', orderId);

      if (updateError) throw updateError;
      return { success: true };
    } catch (error) {
      console.error('Error updating vendor portion status:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update status' };
    }
  }

  /**
   * Pharmacy: vendor submits item availability, alternatives, and pricing; moves to Preparing with quoted total.
   */
  static async submitMedicineVendorReview(
    orderId: string,
    vendorId: string,
    items: OrderItemDetail[],
    vendorSubtotal: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createServiceSupabaseClient();
      const { data: order, error: fetchError } = await supabase
        .from('placed_orders')
        .select('*')
        .eq('order_id', orderId)
        .single();
      if (fetchError) throw fetchError;

      const updatedPortions = (order.vendor_portions as VendorOrderPortion[]).map((portion) => {
        if (portion.vendorId !== vendorId) return portion;
        return {
          ...portion,
          status: 'Preparing' as const,
          items,
          vendorSubtotal,
        };
      });

      const { error: updateError } = await supabase
        .from('placed_orders')
        .update({
          vendor_portions: updatedPortions,
          overall_status: 'In Progress',
          grand_total: vendorSubtotal,
          payment_status: 'Pending',
        })
        .eq('order_id', orderId);

      if (updateError) throw updateError;
      return { success: true };
    } catch (error) {
      console.error('Error submitting medicine review:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to submit review' };
    }
  }

  /**
   * Subscribe to real‑time updates for a vendor's orders.
   */
  static subscribeToVendorOrders(
    vendorId: string,
    callback: (orders: VendorDisplayOrder[]) => void
  ): () => void {
    const supabase = getSupabaseClient();
    // Initial fetch
    this.getVendorOrders(vendorId).then(callback);
    // Subscribe to changes
    const subscription = supabase
      .channel('vendor_orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'placed_orders'
        },
        async (payload) => {
          console.log('🔔 Received Supabase Realtime event:', payload);
          const orders = await this.getVendorOrders(vendorId);
          callback(orders);
        }
      )
      .subscribe();
    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Map a raw database record to the VendorDisplayOrder shape.
   */
  private static mapToVendorDisplayOrder(data: any, vendorId: string): VendorDisplayOrder {
    const vendorPortion = (data.vendor_portions as any[]).find((p) => p.vendorId === vendorId);
    return {
      id: data.id,
      orderId: data.order_id,
      customerInfo: data.customer_info,
      tripStartLocation: data.trip_start_location,
      tripDestination: data.trip_destination,
      createdAt: data.created_at,
      overallStatus: data.overall_status,
      paymentStatus: data.payment_status,
      grandTotal: parseFloat(data.grand_total),
      platformFee: parseFloat(data.platform_fee || 0),
      paymentGatewayFee: parseFloat(data.payment_gateway_fee || 0),
      vendorIds: data.vendor_ids,
      vendorPortion: vendorPortion || {
        vendorId,
        vendorName: 'Unknown',
        status: 'New',
        items: [],
        vendorSubtotal: 0
      }
    } as VendorDisplayOrder;
  }
}
