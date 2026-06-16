import type {
  CartFoodItem,
  CartMedicineItem,
  GroceryListItem,
  OrderCategory,
  OrderFlowState,
  PickupStore,
} from '@/types/order-flow';

export function estimateGroceryUnitPrice(unit: GroceryListItem['unit']): number {
  if (unit === 'kg') return 120;
  if (unit === 'litre') return 90;
  if (unit === 'gram') return 0.5;
  if (unit === 'ml') return 0.2;
  if (unit === 'dozen') return 80;
  return 45;
}

export function estimateGroceryLinePrice(item: GroceryListItem): number {
  return Math.round(item.quantity * estimateGroceryUnitPrice(item.unit));
}

export function estimateFoodLinePrice(item: CartFoodItem): number {
  return Math.round(item.quantity * item.unitPrice);
}

export function estimateMedicineLinePrice(item: CartMedicineItem): number {
  return Math.round(item.quantity * item.unitPrice);
}

export type CartCategorySummary = {
  category: OrderCategory;
  label: string;
  itemCount: number;
  subtotal: number;
  hasQuotePending: boolean;
};

export type CartSummary = {
  itemCount: number;
  subtotal: number;
  savings: number;
  total: number;
  categories: CartCategorySummary[];
  pickupStores: PickupStore[];
};

const CATEGORY_LABELS: Record<OrderCategory, string> = {
  grocery: 'Grocery',
  food: 'Food',
  medicine: 'Medicine',
};

export function getPickupStores(state: OrderFlowState): PickupStore[] {
  const stores: PickupStore[] = [];

    if (state.categories.includes('grocery') && state.groceryItems.length > 0) {
    const option =
      state.routeOptions.find((o) => o.id === state.selectedRouteOptionId) ??
      state.routeOptions[0];
    if (option?.shopIds?.[0] && option.shopNames?.[0]) {
      stores.push({
        category: 'grocery',
        vendorId: option.shopIds[0],
        vendorName: option.shopNames[0],
        address: option.shopAddress || option.streetName || undefined,
      });
    }
  }

  if (state.categories.includes('food') && state.selectedFoodVendor) {
    stores.push(state.selectedFoodVendor);
  }

  if (state.categories.includes('medicine') && state.selectedMedicineVendor) {
    stores.push(state.selectedMedicineVendor);
  }

  return stores;
}

export function computeCartSummary(state: OrderFlowState): CartSummary {
  const categories: CartCategorySummary[] = [];
  let itemCount = 0;
  let subtotal = 0;

  if (state.categories.includes('grocery') && state.groceryItems.length > 0) {
    const grocerySubtotal = state.groceryItems.reduce(
      (sum, item) => sum + estimateGroceryLinePrice(item),
      0
    );
    const count = state.groceryItems.reduce((sum, item) => sum + item.quantity, 0);
    itemCount += count;
    subtotal += grocerySubtotal;
    categories.push({
      category: 'grocery',
      label: CATEGORY_LABELS.grocery,
      itemCount: count,
      subtotal: grocerySubtotal,
      hasQuotePending: false,
    });
  }

  if (state.categories.includes('food') && state.foodItems.length > 0) {
    const foodSubtotal = state.foodItems.reduce(
      (sum, item) => sum + estimateFoodLinePrice(item),
      0
    );
    const count = state.foodItems.reduce((sum, item) => sum + item.quantity, 0);
    itemCount += count;
    subtotal += foodSubtotal;
    categories.push({
      category: 'food',
      label: CATEGORY_LABELS.food,
      itemCount: count,
      subtotal: foodSubtotal,
      hasQuotePending: false,
    });
  }

  if (state.categories.includes('medicine') && state.medicineItems.length > 0) {
    const medicineSubtotal = state.medicineItems.reduce(
      (sum, item) => sum + estimateMedicineLinePrice(item),
      0
    );
    const count = state.medicineItems.reduce((sum, item) => sum + item.quantity, 0);
    itemCount += count;
    subtotal += medicineSubtotal;
    categories.push({
      category: 'medicine',
      label: CATEGORY_LABELS.medicine,
      itemCount: count,
      subtotal: medicineSubtotal,
      hasQuotePending: medicineSubtotal === 0,
    });
  }

  const option =
    state.routeOptions.find((o) => o.id === state.selectedRouteOptionId) ??
    state.routeOptions[0];
  const savings = option?.savings ?? 0;

  return {
    itemCount,
    subtotal,
    savings,
    total: Math.max(0, subtotal - savings),
    categories,
    pickupStores: getPickupStores(state),
  };
}

export function formatCartInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}
