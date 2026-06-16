import { consumerOrderService } from '@/lib/consumer-order-service';
import {
  computeCartSummary,
  estimateFoodLinePrice,
  estimateGroceryLinePrice,
  estimateGroceryUnitPrice,
  estimateMedicineLinePrice,
  getPickupStores,
} from '@/lib/order-cart-pricing';
import type { PlacedOrder, VendorOrderPortion } from '@/lib/orderModels';
import type { OrderFlowState } from '@/types/order-flow';

async function fetchVendorLocations(
  vendorIds: string[]
): Promise<Map<string, { latitude: number; longitude: number }>> {
  const locations = new Map<string, { latitude: number; longitude: number }>();
  if (vendorIds.length === 0) return locations;

  const { getSupabaseClient } = await import('@/lib/supabase/client');
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('vendors')
    .select('id, location')
    .in('id', vendorIds);

  if (error || !data) return locations;

  data.forEach((vendor: { id: string; location?: unknown }) => {
    const loc = vendor.location as
      | { type?: string; coordinates?: [number, number]; latitude?: number; longitude?: number }
      | null
      | undefined;
    if (!loc) return;
    if (loc.type === 'Point' && loc.coordinates) {
      locations.set(vendor.id, {
        longitude: loc.coordinates[0],
        latitude: loc.coordinates[1],
      });
    } else if (loc.latitude != null && loc.longitude != null) {
      locations.set(vendor.id, { latitude: loc.latitude, longitude: loc.longitude });
    }
  });

  return locations;
}

function buildVendorPortions(
  flow: OrderFlowState,
  vendorLocations: Map<string, { latitude: number; longitude: number }>
): VendorOrderPortion[] {
  const portions: VendorOrderPortion[] = [];

  if (
    flow.categories.includes('grocery') &&
    flow.groceryItems.length > 0 &&
    flow.selectedGroceryVendor
  ) {
    const vendor = flow.selectedGroceryVendor;
    portions.push({
      vendorId: vendor.vendorId,
      vendorName: vendor.vendorName,
      vendorAddress: vendor.address,
      vendorType: 'grocery',
      vendorLocation: vendorLocations.get(vendor.vendorId),
      status: 'New',
      orderType: 'grocery',
      vendorSubtotal: flow.groceryItems.reduce((s, i) => s + estimateGroceryLinePrice(i), 0),
      items: flow.groceryItems.map((item) => ({
        itemId: item.id,
        name: item.name,
        quantity: item.quantity,
        pricePerItem: estimateGroceryUnitPrice(item.unit),
        totalPrice: estimateGroceryLinePrice(item),
        details: `${item.quantity} ${item.unit}`,
      })),
    });
  }

  if (flow.categories.includes('food') && flow.foodItems.length > 0 && flow.selectedFoodVendor) {
    const vendor = flow.selectedFoodVendor;
    portions.push({
      vendorId: vendor.vendorId,
      vendorName: vendor.vendorName,
      vendorAddress: vendor.address,
      vendorType: 'food',
      vendorLocation: vendorLocations.get(vendor.vendorId),
      status: 'New',
      orderType: 'food',
      vendorSubtotal: flow.foodItems.reduce((s, i) => s + estimateFoodLinePrice(i), 0),
      items: flow.foodItems.map((item) => ({
        itemId: item.id,
        name: item.name,
        quantity: item.quantity,
        pricePerItem: item.unitPrice,
        totalPrice: estimateFoodLinePrice(item),
      })),
    });
  }

  if (
    flow.categories.includes('medicine') &&
    flow.medicineItems.length > 0 &&
    flow.selectedMedicineVendor
  ) {
    const vendor = flow.selectedMedicineVendor;
    portions.push({
      vendorId: vendor.vendorId,
      vendorName: vendor.vendorName,
      vendorAddress: vendor.address,
      vendorType: 'pharmacy',
      vendorLocation: vendorLocations.get(vendor.vendorId),
      status: 'New',
      orderType: 'medicine',
      vendorSubtotal: flow.medicineItems.reduce((s, i) => s + estimateMedicineLinePrice(i), 0),
      items: flow.medicineItems.map((item) => ({
        itemId: item.id,
        name: item.name,
        quantity: item.quantity,
        pricePerItem: item.unitPrice,
        totalPrice: estimateMedicineLinePrice(item),
        details: item.dosage,
      })),
    });
  }

  return portions;
}

export async function placeOrderFromFlow(
  flow: OrderFlowState
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  const summary = computeCartSummary(flow);
  const pickupStores = getPickupStores(flow);
  const vendorPortions = buildVendorPortions(
    flow,
    await fetchVendorLocations(pickupStores.map((s) => s.vendorId))
  );

  if (vendorPortions.length === 0) {
    return { success: false, error: 'No items to order' };
  }

  const orderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const order: PlacedOrder = {
    orderId,
    createdAt: new Date().toISOString(),
    overallStatus: 'New',
    paymentStatus: 'Paid',
    grandTotal: summary.total,
    platformFee: 0,
    paymentGatewayFee: 0,
    vendorPortions,
    vendorIds: vendorPortions.map((v) => v.vendorId),
    tripStartLocation: flow.startLocationQuery || undefined,
    tripDestination: flow.destinationQuery || undefined,
    customerInfo: {
      name: 'Guest User',
      phoneNumber: '+919876543210',
    },
  };

  const result = await consumerOrderService.createOrder(order);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem('food_cart');
    localStorage.removeItem('food_cart_shop');
  }

  return { success: true, orderId };
}
