import type { CartFoodItem, PickupStore } from '@/types/order-flow';

const FOOD_CART_KEY = 'food_cart';
const FOOD_CART_SHOP_KEY = 'food_cart_shop';

export type FoodCartShop = {
  id: string;
  name: string;
  address?: string;
};

export function clearFoodCartStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(FOOD_CART_KEY);
  localStorage.removeItem(FOOD_CART_SHOP_KEY);
}

export function persistFoodCartStorage(
  items: CartFoodItem[],
  shop: FoodCartShop | PickupStore | null
): void {
  if (typeof window === 'undefined') return;

  if (items.length === 0 || !shop) {
    clearFoodCartStorage();
    return;
  }

  const vendorId = 'vendorId' in shop ? shop.vendorId : shop.id;
  const vendorName = 'vendorName' in shop ? shop.vendorName : shop.name;

  const entries = items.map((item) => [
    item.id,
    {
      item: { id: item.id, name: item.name, price: item.unitPrice },
      quantity: item.quantity,
    },
  ]);

  localStorage.setItem(FOOD_CART_KEY, JSON.stringify(entries));
  localStorage.setItem(
    FOOD_CART_SHOP_KEY,
    JSON.stringify({
      id: vendorId,
      name: vendorName,
      address: shop.address,
    })
  );
}

export function importFoodCartFromStorage(): {
  foodItems: CartFoodItem[];
  selectedFoodVendor: PickupStore;
} | null {
  if (typeof window === 'undefined') return null;

  try {
    const savedCart = localStorage.getItem(FOOD_CART_KEY);
    const savedShop = localStorage.getItem(FOOD_CART_SHOP_KEY);
    if (!savedCart) return null;

    const entries: [string, { item: { id: string; name: string; price: number }; quantity: number }][] =
      JSON.parse(savedCart);
    const foodItems: CartFoodItem[] = entries.map(([, cartItem]) => ({
      id: cartItem.item.id,
      name: cartItem.item.name,
      quantity: cartItem.quantity,
      unitPrice: cartItem.item.price,
    }));

    if (foodItems.length === 0) return null;

    let selectedFoodVendor: PickupStore | null = null;
    if (savedShop) {
      const shop = JSON.parse(savedShop) as FoodCartShop;
      selectedFoodVendor = {
        category: 'food',
        vendorId: shop.id,
        vendorName: shop.name,
        address: shop.address,
      };
    }

    if (!selectedFoodVendor) return null;

    return { foodItems, selectedFoodVendor };
  } catch {
    return null;
  }
}
