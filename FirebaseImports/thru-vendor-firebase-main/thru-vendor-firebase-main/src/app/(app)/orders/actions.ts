'use server';

import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { SupabasePlacedOrderService } from '@/lib/supabase/placed-order-service';
import type { VendorDisplayOrder, PlacedOrder, VendorOrderPortion, OrderItemDetail } from '@/lib/orderModels';

/**
 * Fetches all relevant orders for a given vendor using Supabase.
 */export async function fetchVendorOrders(vendorId: string): Promise<VendorDisplayOrder[]> {
  if (!vendorId) {
    console.error('[fetchVendorOrders] vendorId is required.');
    return [];
  }
  // Supabase service handles the query and returns VendorDisplayOrder[]
  return await SupabasePlacedOrderService.getVendorOrders(vendorId);
}

/**
 * Updates the status of a specific vendor's portion of an order.
 */
export async function updateVendorOrderStatus(
  orderId: string,
  newStatus: VendorOrderPortion['status'],
  prepTime?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session.isAuthenticated) {
      return { success: false, error: 'Authentication required.' };
    }
    const vendorId = session.uid;
    const result = await SupabasePlacedOrderService.updateVendorPortionStatus(
      orderId,
      vendorId,
      newStatus,
      prepTime
    );
    if (!result.success) {
      return { success: false, error: result.error };
    }
    revalidatePath('/orders');
    return { success: true };
  } catch (error) {
    console.error(`[updateVendorOrderStatus] Error updating order ${orderId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, error: `Failed to update order status. ${errorMessage}` };
  }
}

/**
 * Fetches details for a single order, tailored for the vendor view.
 */
export async function fetchOrderDetails(orderId: string): Promise<VendorDisplayOrder | null> {
  const session = await getSession();
  if (!session.isAuthenticated) {
    console.error('[fetchOrderDetails] Not authenticated.');
    return null;
  }
  const vendorId = session.uid;
  const order = await SupabasePlacedOrderService.getOrder(orderId);
  if (!order) return null;
  const vendorPortion = order.vendorPortions.find(p => p.vendorId === vendorId);
  if (!vendorPortion) return null;
  const { vendorPortions, ...rootOrderData } = order;
  return {
    ...rootOrderData,
    vendorPortion,
  } as VendorDisplayOrder;
}

/**
 * Pharmacy: accept order with per-item availability, alternatives, and quoted prices.
 */
export async function submitMedicineVendorReview(
  orderId: string,
  items: OrderItemDetail[],
  vendorSubtotal: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session.isAuthenticated) {
      return { success: false, error: 'Authentication required.' };
    }
    const result = await SupabasePlacedOrderService.submitMedicineVendorReview(
      orderId,
      session.uid,
      items,
      vendorSubtotal
    );
    if (!result.success) return result;
    revalidatePath('/orders');
    return { success: true };
  } catch (error) {
    console.error('[submitMedicineVendorReview]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit pharmacy quote',
    };
  }
}