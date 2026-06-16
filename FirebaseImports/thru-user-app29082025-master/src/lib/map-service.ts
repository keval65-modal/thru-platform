/**
 * Map Service - Handles map-related data operations
 */

import { getSupabaseClient } from './supabase/client';
import { ShopMarkerData, ShopCategory, OperatingHours } from '@/types/map-types';
import {
  isShopOpen,
  operatingHoursFromVendorFields,
} from '@/utils/operating-hours';

/**
 * Map category string to ShopCategory enum
 */
function mapCategoryToEnum(category: string): ShopCategory {
  const categoryLower = category.toLowerCase();
  
  if (categoryLower.includes('cafe') || categoryLower.includes('coffee')) {
    return ShopCategory.CAFE;
  }
  if (categoryLower.includes('restaurant') || categoryLower.includes('food')) {
    return ShopCategory.RESTAURANT;
  }
  if (categoryLower.includes('medical') || categoryLower.includes('pharmacy') || categoryLower.includes('health')) {
    return ShopCategory.MEDICAL;
  }
  if (
    categoryLower.includes('grocery') ||
    categoryLower.includes('supermarket') ||
    categoryLower.includes('kirana') ||
    categoryLower.includes('mart') ||
    categoryLower.includes('shop')
  ) {
    return ShopCategory.GROCERY;
  }
  
  return ShopCategory.OTHER;
}

function resolveShopCategory(
  storeType: string | null | undefined,
  categories: string[],
  name: string
): ShopCategory {
  if (storeType) {
    const fromStore = mapCategoryToEnum(storeType);
    if (fromStore !== ShopCategory.OTHER) return fromStore;
  }
  const fromCategories = getPrimaryCategory(categories);
  if (fromCategories !== ShopCategory.OTHER) return fromCategories;
  if (/\b(super\s*shop|shoppee|kirana|grocery|mart|provision)\b/i.test(name)) {
    return ShopCategory.GROCERY;
  }
  return ShopCategory.OTHER;
}

/**
 * Get primary category from categories array
 */
function getPrimaryCategory(categories: string[]): ShopCategory {
  if (!categories || categories.length === 0) {
    return ShopCategory.OTHER;
  }
  
  // Return the first category mapped to enum
  return mapCategoryToEnum(categories[0]);
}

/**
 * Fetch all active shops for map display
 */
export async function getAllShopsForMap(
  categoryFilter?: ShopCategory[]
): Promise<ShopMarkerData[]> {
  try {
    const supabase = getSupabaseClient();

    let query = supabase
      .from('vendors')
      .select(
        'id, name, address, location, categories, store_type, operating_hours, opening_time, closing_time, weekly_close_on, phone, email, image_url'
      )
      .eq('is_active', true)
      .eq('is_active_on_thru', true);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching shops for map:', error);
      return [];
    }

    if (!data) {
      return [];
    }

    // Transform data to ShopMarkerData format
    let shops: ShopMarkerData[] = data.map((vendor) => {
      // Parse location from JSONB
      let location = vendor.location;
      if (location && location.type === 'Point' && location.coordinates) {
        // GeoJSON format: [longitude, latitude]
        location = {
          longitude: location.coordinates[0],
          latitude: location.coordinates[1]
        };
      }

      const primaryCategory = resolveShopCategory(
        vendor.store_type,
        vendor.categories || [],
        vendor.name || ''
      );
      const operatingHours =
        (vendor.operating_hours as OperatingHours | null) ||
        operatingHoursFromVendorFields(
          vendor.opening_time,
          vendor.closing_time,
          vendor.weekly_close_on
        );

      return {
        id: vendor.id,
        name: vendor.name,
        category: primaryCategory,
        address: vendor.address || undefined,
        location: {
          latitude: location?.latitude || 0,
          longitude: location?.longitude || 0
        },
        operatingHours: operatingHours || undefined,
        isOpen: isShopOpen(operatingHours),
        phone: vendor.phone || undefined,
        email: vendor.email || undefined
      };
    });

    // Filter by categories if specified
    if (categoryFilter && categoryFilter.length > 0) {
      shops = shops.filter(shop => categoryFilter.includes(shop.category));
    }

    return shops;
  } catch (error) {
    console.error('Error in getAllShopsForMap:', error);
    return [];
  }
}

/**
 * Subscribe to real-time shop updates
 */
export function subscribeToShopUpdates(
  callback: (shops: ShopMarkerData[]) => void
) {
  const supabase = getSupabaseClient();

  const channel = supabase
    .channel('vendors-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'vendors'
      },
      async () => {
        // Refetch all shops when any change occurs
        const shops = await getAllShopsForMap();
        callback(shops);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Get shop by ID
 */
export async function getShopById(shopId: string): Promise<ShopMarkerData | null> {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('vendors')
      .select(
        'id, name, address, location, categories, store_type, operating_hours, opening_time, closing_time, weekly_close_on, phone, email, image_url'
      )
      .eq('id', shopId)
      .single();

    if (error || !data) {
      console.error('Error fetching shop:', error);
      return null;
    }

    // Parse location
    let location = data.location;
    if (location && location.type === 'Point' && location.coordinates) {
      location = {
        longitude: location.coordinates[0],
        latitude: location.coordinates[1]
      };
    }

    const primaryCategory = resolveShopCategory(
      data.store_type,
      data.categories || [],
      data.name || ''
    );
    const operatingHours =
      (data.operating_hours as OperatingHours | null) ||
      operatingHoursFromVendorFields(
        data.opening_time,
        data.closing_time,
        data.weekly_close_on
      );

    return {
      id: data.id,
      name: data.name,
      category: primaryCategory,
      address: data.address || undefined,
      location: {
        latitude: location?.latitude || 0,
        longitude: location?.longitude || 0
      },
      operatingHours: operatingHours || undefined,
      isOpen: isShopOpen(operatingHours),
      phone: data.phone || undefined,
      email: data.email || undefined
    };
  } catch (error) {
    console.error('Error in getShopById:', error);
    return null;
  }
}
