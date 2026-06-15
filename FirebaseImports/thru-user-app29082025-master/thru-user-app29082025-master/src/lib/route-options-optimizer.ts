import type { GroceryListItem, RouteOption } from '@/types/order-flow';
import type { RouteBasedShop } from '@/lib/route-based-shop-discovery';

function estimateGroceryTotal(items: GroceryListItem[]): number {
  return items.reduce((sum, item) => {
    const multiplier = item.unit === 'kg' ? 120 : item.unit === 'litre' ? 90 : 45;
    return sum + item.quantity * multiplier;
  }, 0);
}

function minutesFromShop(shop: RouteBasedShop): number {
  if (shop.estimatedTime > 0) return Math.round(shop.estimatedTime);
  return Math.max(1, Math.round(shop.detourDistance * 3));
}

/**
 * Build 3 route options ranked by time vs price — detour km is internal only.
 */
export function buildRouteOptions(
  shops: RouteBasedShop[],
  groceryItems: GroceryListItem[],
  baselineMinutes = 0
): RouteOption[] {
  if (shops.length === 0) {
    return [];
  }

  const sorted = [...shops].sort((a, b) => a.detourDistance - b.detourDistance);
  const basePrice = estimateGroceryTotal(groceryItems);

  const picks = [
    sorted[0],
    sorted[Math.min(1, sorted.length - 1)],
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length / 2))],
  ];

  const uniquePicks = Array.from(new Map(picks.map((s) => [s.id, s])).values())
    .filter((shop) => Boolean(shop?.id))
    .slice(0, 3);

  if (uniquePicks.length === 0) return [];

  return uniquePicks.map((shop, index) => {
    const added = minutesFromShop(shop);
    const priceVariance = index * 0.04;
    const totalPrice = Math.round(basePrice * (1 + priceVariance));
    const savings = Math.max(0, Math.round(basePrice * (0.12 - index * 0.03)));

    return {
      id: `opt-${String.fromCharCode(65 + index)}`,
      label: `Option ${String.fromCharCode(65 + index)}`,
      totalPrice,
      savings,
      addedMinutes: Math.max(added, baselineMinutes + index * 2),
      shopIds: [shop.id],
      shopNames: [shop.name],
      description:
        index === 0
          ? `Fastest stop — ${shop.name}`
          : index === 1
          ? `Best balance — ${shop.name}`
          : `Best value — ${shop.name}`,
    };
  });
}

export function estimateOrderTotal(items: GroceryListItem[]): number {
  return estimateGroceryTotal(items);
}

export function rankWorthTheStop(
  shops: RouteBasedShop[],
  hour: number
): Array<RouteBasedShop & { perk?: string; isSponsored?: boolean }> {
  const mealPerk = (h: number) => {
    if (h >= 7 && h < 11) return 'Great breakfast stop';
    if (h >= 11 && h < 15) return 'Lunch pick on your route';
    if (h >= 18 && h < 22) return 'Dinner worth the stop';
    return 'Recommended on your route';
  };

  return [...shops]
    .sort((a, b) => a.detourDistance - b.detourDistance)
    .slice(0, 6)
    .map((shop, i) => ({
      ...shop,
      perk: i === 0 ? 'Free dessert today' : mealPerk(hour),
      isSponsored: i < 2,
    }));
}
