import type { StoreType } from '@/types/grocery-advanced';
import type { OrderCategory } from '@/types/order-flow';
import { MAX_ROUTE_DETOUR_KM, ON_ROUTE_DETOUR_KM } from '@/types/order-flow';
import type { PickupStore } from '@/types/order-flow';
import {
  routeBasedShopDiscovery,
  type RouteBasedShop,
  type RoutePoint,
} from '@/lib/route-based-shop-discovery';
import { shopMatchesStoreTypes } from '@/lib/vendor-store-types';

export type RouteShopSearchTier = 'on_route' | 'detour' | 'none';

export type RouteShopSearchResult = {
  shops: RouteBasedShop[];
  tier: RouteShopSearchTier;
};

const GROCERY_STORE_TYPES: StoreType[] = ['grocery', 'supermarket'];
const FOOD_STORE_TYPES: StoreType[] = [
  'restaurant',
  'cafe',
  'bakery',
  'fast_food',
  'cloud_kitchen',
];

export function storeTypesForOrderCategories(categories: OrderCategory[]): StoreType[] {
  const wantsGrocery = categories.includes('grocery');
  const wantsFood = categories.includes('food');
  const wantsMedicine = categories.includes('medicine');

  const types: StoreType[] = [];
  if (wantsGrocery) types.push(...GROCERY_STORE_TYPES);
  if (wantsFood) types.push(...FOOD_STORE_TYPES);
  if (wantsMedicine) types.push('pharmacy', 'medical');

  if (types.length > 0) {
    return [...new Set(types)];
  }

  return GROCERY_STORE_TYPES;
}

function filterShopsByCategory(
  shops: RouteBasedShop[],
  categories: OrderCategory[]
): RouteBasedShop[] {
  const storeTypes = storeTypesForOrderCategories(categories);
  return shops.filter((shop) => shopMatchesStoreTypes(shop, storeTypes));
}

/** Find shops on-route first, then expand up to MAX_ROUTE_DETOUR_KM. */
export async function findRouteShopsWithFallback(
  start: RoutePoint,
  end: RoutePoint,
  categories: OrderCategory[]
): Promise<RouteShopSearchResult> {
  const storeTypes = storeTypesForOrderCategories(categories);

  const onRoute = await routeBasedShopDiscovery.findShopsAlongRoute(
    start,
    end,
    ON_ROUTE_DETOUR_KM,
    storeTypes
  );
  const onRouteFiltered = filterShopsByCategory(onRoute.shops, categories);
  if (onRouteFiltered.length > 0) {
    return { shops: onRouteFiltered, tier: 'on_route' };
  }

  const detour = await routeBasedShopDiscovery.findShopsAlongRoute(
    start,
    end,
    MAX_ROUTE_DETOUR_KM,
    storeTypes
  );
  const detourFiltered = filterShopsByCategory(detour.shops, categories);
  if (detourFiltered.length > 0) {
    return { shops: detourFiltered, tier: 'detour' };
  }

  return { shops: [], tier: 'none' };
}

/** Ensure a pharmacy/food vendor picked on the previous step appears in route options. */
export function mergePickupVendorsIntoShops(
  shops: RouteBasedShop[],
  vendors: PickupStore[]
): RouteBasedShop[] {
  const merged = [...shops];
  const seen = new Set(merged.map((s) => s.id));

  for (const vendor of vendors) {
    if (!vendor.vendorId || seen.has(vendor.vendorId)) continue;
    merged.push({
      id: vendor.vendorId,
      name: vendor.vendorName,
      type: vendor.category === 'medicine' ? 'pharmacy' : 'restaurant',
      coordinates: { lat: 0, lng: 0 },
      address: vendor.address ?? '',
      categories: vendor.category === 'medicine' ? ['pharmacy'] : ['restaurant'],
      distanceFromRoute: 0,
      detourDistance: 0,
      routePosition: 0.5,
      estimatedTime: 0,
      isOnRoute: true,
    });
    seen.add(vendor.vendorId);
  }

  return merged;
}
