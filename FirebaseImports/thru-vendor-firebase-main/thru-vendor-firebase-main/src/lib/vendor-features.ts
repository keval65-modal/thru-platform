export function normalizeCategory(value?: string | null) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function isMenuUploadEnabled(storeCategory?: string | null) {
  const v = normalizeCategory(storeCategory);
  // Only allow for: Restaurants, Cafes, Bakeries
  return v === 'restaurant' || v === 'cafe' || v === 'bakery';
}

