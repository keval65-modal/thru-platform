import type { StoreType } from '@/types/grocery-advanced';

const GROCERY_TYPE_TOKENS = new Set([
  'grocery',
  'supermarket',
  'grocery store',
  'convenience',
  'general store',
  'kirana',
  'mart',
]);

const FOOD_TYPE_TOKENS = new Set([
  'restaurant',
  'cafe',
  'cloud_kitchen',
  'bakery',
  'fast_food',
  'fine_dining',
  'food_truck',
  'coffee_shop',
  'bar',
  'pub',
]);

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
}

/** Map vendor store_type / categories / name to a canonical store type. */
export function resolveCanonicalStoreType(
  rawType?: string | null,
  categories: string[] = [],
  name = ''
): StoreType | 'other' {
  const typeNorm = normalizeToken(rawType || '');
  if (GROCERY_TYPE_TOKENS.has(typeNorm) || typeNorm.includes('grocery') || typeNorm.includes('super')) {
    return 'grocery';
  }
  if (FOOD_TYPE_TOKENS.has(typeNorm)) {
    return typeNorm.replace(/\s+/g, '_') as StoreType;
  }
  if (typeNorm === 'medical' || typeNorm === 'pharmacy') {
    return typeNorm as StoreType;
  }

  for (const cat of categories) {
    const c = normalizeToken(cat);
    if (c.includes('grocery') || c.includes('super') || c.includes('kirana')) return 'grocery';
    if (c.includes('restaurant') || c.includes('food')) return 'restaurant';
    if (c.includes('cafe') || c.includes('coffee')) return 'cafe';
    if (c.includes('medical') || c.includes('pharmacy')) return 'pharmacy';
  }

  if (/\b(super\s*shop|shoppee|kirana|grocery|mart|provision)\b/i.test(name)) {
    return 'grocery';
  }

  return (typeNorm || 'other') as StoreType | 'other';
}

export function shopMatchesStoreTypes(
  shop: { type: StoreType | string; categories?: string[]; name?: string },
  requestedTypes: StoreType[]
): boolean {
  const canonical = resolveCanonicalStoreType(shop.type, shop.categories, shop.name);
  const requested = new Set(
    requestedTypes.map((t) => normalizeToken(String(t)).replace(/\s+/g, '_'))
  );

  const canonicalNorm = normalizeToken(String(canonical)).replace(/\s+/g, '_');
  if (requested.has(canonicalNorm)) return true;

  // Grocery list should include general stores / "Other" that are clearly grocery shops.
  if (requested.has('grocery') || requested.has('supermarket')) {
    if (canonical === 'grocery') return true;
    if (canonical === 'other' && /\b(shop|mart|store|shoppee|super|kirana|provision)\b/i.test(shop.name || '')) {
      return true;
    }
  }

  return false;
}
