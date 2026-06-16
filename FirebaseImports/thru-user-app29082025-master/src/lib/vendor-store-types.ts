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

const FOOD_NAME_PATTERN =
  /\b(pizza|bistro|cafe|restaurant|kitchen|diner|grill|bar|pub|bakery|burger|taco|sushi|wok|dhaba|eatery)\b/i;

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

  if (FOOD_NAME_PATTERN.test(name)) {
    return 'restaurant';
  }

  return (typeNorm || 'other') as StoreType | 'other';
}

export function isFoodStoreType(
  rawType?: string | null,
  categories: string[] = [],
  name = ''
): boolean {
  const canonical = resolveCanonicalStoreType(rawType, categories, name);
  const norm = normalizeToken(String(canonical)).replace(/\s+/g, '_');
  return FOOD_TYPE_TOKENS.has(norm) || FOOD_NAME_PATTERN.test(name);
}

export function isGroceryStoreType(
  rawType?: string | null,
  categories: string[] = [],
  name = ''
): boolean {
  if (isFoodStoreType(rawType, categories, name)) return false;
  const canonical = resolveCanonicalStoreType(rawType, categories, name);
  if (canonical === 'grocery' || canonical === 'supermarket') return true;
  if (canonical === 'other' && /\b(shop|mart|store|shoppee|super|kirana|provision)\b/i.test(name)) {
    return true;
  }
  return false;
}

export function isMedicineStoreType(
  rawType?: string | null,
  categories: string[] = [],
  name = ''
): boolean {
  const canonical = resolveCanonicalStoreType(rawType, categories, name);
  const norm = normalizeToken(String(canonical)).replace(/\s+/g, '_');
  if (norm === 'medical' || norm === 'pharmacy') return true;
  if (/\b(pharmacy|chemist|medical|med\s*store|drug\s*store|medicine)\b/i.test(name)) return true;
  return categories.some((c) => {
    const n = normalizeToken(c);
    return n.includes('medical') || n.includes('pharmacy') || n.includes('chemist');
  });
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
  const groceryRequested = requested.has('grocery') || requested.has('supermarket');
  const foodRequested = [...FOOD_TYPE_TOKENS].some((t) => requested.has(t));
  const medicineRequested = requested.has('medical') || requested.has('pharmacy');

  if (groceryRequested && !foodRequested && isFoodStoreType(shop.type, shop.categories, shop.name)) {
    return false;
  }

  if (foodRequested && !groceryRequested && !medicineRequested && isGroceryStoreType(shop.type, shop.categories, shop.name)) {
    return false;
  }

  if (medicineRequested && !groceryRequested && !foodRequested) {
    return isMedicineStoreType(shop.type, shop.categories, shop.name);
  }

  if (requested.has(canonicalNorm)) return true;

  // Grocery list should include general stores / "Other" that are clearly grocery shops.
  if (groceryRequested) {
    return isGroceryStoreType(shop.type, shop.categories, shop.name);
  }

  if (medicineRequested) {
    return isMedicineStoreType(shop.type, shop.categories, shop.name);
  }

  return false;
}
