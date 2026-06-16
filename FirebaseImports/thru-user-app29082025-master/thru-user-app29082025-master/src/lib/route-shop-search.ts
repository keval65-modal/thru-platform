import type { StoreType } from '@/types/grocery-advanced';
import type { OrderCategory } from '@/types/order-flow';
import { MAX_ROUTE_DETOUR_KM, ON_ROUTE_DETOUR_KM } from '@/types/order-flow';
import {
  routeBasedShopDiscovery,
  type RouteBasedShop,
  type RoutePoint,
} from '@/lib/route-based-shop-discovery';
import { isGroceryStoreType, isFoodStoreType } from '@/lib/vendor-store-types';

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

  if (wantsMedicine && !wantsGrocery && !wantsFood) {
    return ['pharmacy', 'medical'];
  }

  if (wantsFood && !wantsGrocery) {
    return FOOD_STORE_TYPES;
  }

  // Options step prices grocery lists — prefer grocery shops even when food is also selected.
  return GROCERY_STORE_TYPES;
}

function filterShopsByCategory(
  shops: RouteBasedShop[],
  categories: OrderCategory[]
): RouteBasedShop[] {
  const storeTypes = storeTypesForOrderCategories(categories);
  const groceryMode = storeTypes.every((t) => t === 'grocery' || t === 'supermarket');

  return shops.filter((shop) => {
    if (groceryMode) {
      return isGroceryStoreType(shop.type, shop.categories, shop.name);
    }
    return isFoodStoreType(shop.type, shop.categories, shop.name);
  });
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
