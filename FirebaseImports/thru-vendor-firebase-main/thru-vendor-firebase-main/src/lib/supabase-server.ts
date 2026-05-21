// Server-side Supabase client for use in Server Actions
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Missing Supabase environment variables!')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Present' : 'MISSING')
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'MISSING')
} else {
  console.log('✅ Supabase environment variables loaded')
  console.log('Supabase URL:', supabaseUrl)
}

// Create server-side client
function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey)
}

// Vendor service for server actions
export const vendorServiceServer = {
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
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = getSupabaseClient()
      
      console.log('🔄 Syncing vendor to Supabase:', vendorData.name)
      
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
        console.error('❌ Supabase vendor sync error:', error)
        return { success: false, error: error.message }
      }

      console.log('✅ Vendor synced to Supabase successfully!')
      return { success: true }
    } catch (err: any) {
      console.error('❌ Unexpected error syncing to Supabase:', err)
      return { success: false, error: err.message || 'Unknown error' }
    }
  }
}


