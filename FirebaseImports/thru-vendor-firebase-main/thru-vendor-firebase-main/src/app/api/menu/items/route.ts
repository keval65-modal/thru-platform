'use server'

import { NextResponse } from 'next/server'

import { getSession } from '@/lib/auth'
import { getSupabaseServiceDbClient } from '@/lib/supabase-auth'
import { isMenuUploadEnabled } from '@/lib/vendor-features'

function getServiceSupabase() {
  const supabase = getSupabaseServiceDbClient()
  if (!supabase) {
    return {
      supabase: null,
      error: NextResponse.json(
        {
          error:
            'Menu management is not configured on the server. Please set SUPABASE_SERVICE_ROLE_KEY.',
        },
        { status: 500 },
      ),
    }
  }
  return { supabase, error: null }
}

async function requireMenuSession() {
  const session = await getSession()
  if (!session.isAuthenticated || !session.id) {
    return { session: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (!isMenuUploadEnabled(session.storeCategory)) {
    return {
      session: null,
      error: NextResponse.json(
        { error: 'Menu management is only available for Restaurants, Cafes, and Bakeries.' },
        { status: 403 },
      ),
    }
  }
  return { session, error: null }
}

export async function GET() {
  const { session, error: sessionError } = await requireMenuSession()
  if (!session || sessionError) return sessionError

  const { supabase, error: serviceError } = getServiceSupabase()
  if (!supabase || serviceError) return serviceError

  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('vendor_id', session.id)
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('[Menu Items GET] Error:', error)
    return NextResponse.json({ error: 'Failed to load menu items.' }, { status: 500 })
  }

  return NextResponse.json({ items: data ?? [] })
}

export async function POST(request: Request) {
  const { session, error: sessionError } = await requireMenuSession()
  if (!session || sessionError) return sessionError

  const { supabase, error: serviceError } = getServiceSupabase()
  if (!supabase || serviceError) return serviceError

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('menu_items')
    .insert([
      {
        vendor_id: session.id,
        name: body.name,
        description: body.description ?? null,
        price: body.price,
        category: body.category ?? null,
        image_url: body.image_url ?? null,
        is_veg: Boolean(body.is_veg),
        is_available: body.is_available !== false,
        preparation_time: body.preparation_time ?? null,
      },
    ])
    .select()
    .single()

  if (error) {
    console.error('[Menu Items POST] Error:', error)
    return NextResponse.json({ error: 'Failed to create menu item.' }, { status: 500 })
  }

  return NextResponse.json({ item: data })
}

export async function PATCH(request: Request) {
  const { session, error: sessionError } = await requireMenuSession()
  if (!session || sessionError) return sessionError

  const { supabase, error: serviceError } = getServiceSupabase()
  if (!supabase || serviceError) return serviceError

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || typeof body.id !== 'string') {
    return NextResponse.json({ error: 'Item id is required.' }, { status: 400 })
  }

  const { id, ...updates } = body
  const { data, error } = await supabase
    .from('menu_items')
    .update(updates)
    .eq('id', id)
    .eq('vendor_id', session.id)
    .select()
    .single()

  if (error) {
    console.error('[Menu Items PATCH] Error:', error)
    return NextResponse.json({ error: 'Failed to update menu item.' }, { status: 500 })
  }

  return NextResponse.json({ item: data })
}

export async function DELETE(request: Request) {
  const { session, error: sessionError } = await requireMenuSession()
  if (!session || sessionError) return sessionError

  const { supabase, error: serviceError } = getServiceSupabase()
  if (!supabase || serviceError) return serviceError

  const id = new URL(request.url).searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Item id is required.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id)
    .eq('vendor_id', session.id)

  if (error) {
    console.error('[Menu Items DELETE] Error:', error)
    return NextResponse.json({ error: 'Failed to delete menu item.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
