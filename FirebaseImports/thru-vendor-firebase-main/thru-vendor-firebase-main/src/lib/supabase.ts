// Supabase client for menu management
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Menu item type
export interface MenuItem {
  id: string
  vendor_id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  category: string | null
  is_available: boolean
  is_veg: boolean
  preparation_time: number | null
  created_at: string
  updated_at: string
}

// Vendor service (for syncing vendors to Supabase)
export const vendorService = {
  // Create or update vendor in Supabase
  async upsertVendor(vendorData: {
    id: string // Firebase UID
    name: string
    email: string
    phone: string
    address: string
    city: string
    latitude: number
    longitude: number
    store_type: string
    owner_name: string
    opening_time: string
    closing_time: string
    weekly_close_on: string
    image_url?: string
  }): Promise<void> {
    const { error } = await supabase
      .from('vendors')
      .upsert({
        id: vendorData.id,
        name: vendorData.name,
        email: vendorData.email,
        phone: vendorData.phone,
        address: vendorData.address,
        city: vendorData.city,
        location: {
          type: 'Point',
          coordinates: [vendorData.longitude, vendorData.latitude]
        },
        store_type: vendorData.store_type.toLowerCase(),
        owner_name: vendorData.owner_name,
        opening_time: vendorData.opening_time,
        closing_time: vendorData.closing_time,
        weekly_close_on: vendorData.weekly_close_on,
        image_url: vendorData.image_url,
        is_active: true,
        is_active_on_thru: true,
        grocery_enabled: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (error) {
      console.error('Error upserting vendor to Supabase:', error)
      throw error
    }
  }
}

// Menu service
export const menuService = {
  // Get all menu items for a vendor
  async getMenuItems(vendorId: string): Promise<MenuItem[]> {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error
    return data || []
  },

  // Get a single menu item
  async getMenuItem(id: string): Promise<MenuItem | null> {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  // Create a menu item
  async createMenuItem(item: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>): Promise<MenuItem> {
    const { data, error } = await supabase
      .from('menu_items')
      .insert([item])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Update a menu item
  async updateMenuItem(id: string, updates: Partial<MenuItem>): Promise<MenuItem> {
    const { data, error } = await supabase
      .from('menu_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Delete a menu item
  async deleteMenuItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Toggle availability
  async toggleAvailability(id: string, isAvailable: boolean): Promise<MenuItem> {
    return this.updateMenuItem(id, { is_available: isAvailable })
  }
}

