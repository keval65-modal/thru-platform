'use server'

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSupabaseServiceDbClient } from '@/lib/supabase-auth'
import { isMenuUploadEnabled } from '@/lib/vendor-features'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session.isAuthenticated || !session.id) {
      return NextResponse.json(
        { error: 'You must be logged in to save menu items.' },
        { status: 401 }
      )
    }

    if (!isMenuUploadEnabled(session.storeCategory)) {
      return NextResponse.json(
        { error: 'Menu management is only available for Restaurants, Cafes, and Bakeries.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { items, replaceExisting } = body

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Invalid request. Items must be an array.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServiceDbClient()
    if (!supabase) {
      return NextResponse.json(
        {
          error:
            'Menu save is not configured on the server. Please set SUPABASE_SERVICE_ROLE_KEY in your deployment environment.',
        },
        { status: 500 },
      )
    }

    if (replaceExisting) {
      const { error: deleteError } = await supabase
        .from('menu_items')
        .delete()
        .eq('vendor_id', session.id)

      if (deleteError) {
        console.error('[Menu Bulk Save] Failed to delete existing items:', deleteError)
        return NextResponse.json(
          { error: 'Failed to clear existing menu items.' },
          { status: 500 }
        )
      }
    }

    // Ensure all items have the correct vendor_id and remove fields that should be auto-generated
    const itemsToInsert = items.map((item: any) => {
      // Destructure to remove id, created_at, updated_at
      const { id, created_at, updated_at, ...cleanItem } = item
      return {
        ...cleanItem,
        vendor_id: session.id,
      }
    })

    const { error: insertError, data } = await supabase
      .from('menu_items')
      .insert(itemsToInsert)
      .select()

    if (insertError) {
      console.error('[Menu Bulk Save] Failed to insert items:', {
        error: insertError,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
        itemCount: itemsToInsert.length,
        sampleItem: itemsToInsert[0]
      })
      return NextResponse.json(
        { error: `Failed to save menu items: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      count: itemsToInsert.length,
      message: `Successfully saved ${itemsToInsert.length} items.`
    })

  } catch (error) {
    console.error('[Menu Bulk Save] Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession()
    if (!session.isAuthenticated || !session.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isMenuUploadEnabled(session.storeCategory)) {
      return NextResponse.json(
        { error: 'Menu management is only available for Restaurants, Cafes, and Bakeries.' },
        { status: 403 },
      )
    }

    const body = await request.json().catch(() => null)
    const ids = body?.ids
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Select at least one item to delete.' }, { status: 400 })
    }

    const validIds = ids.filter((id: unknown) => typeof id === 'string' && id.length > 0)
    if (!validIds.length) {
      return NextResponse.json({ error: 'Invalid item ids.' }, { status: 400 })
    }

    const supabase = getSupabaseServiceDbClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Menu management is not configured on the server.' },
        { status: 500 },
      )
    }

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('vendor_id', session.id)
      .in('id', validIds)

    if (error) {
      console.error('[Menu Bulk Delete] Error:', error)
      return NextResponse.json({ error: 'Failed to delete selected items.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      deleted: validIds.length,
      message: `Deleted ${validIds.length} item(s).`,
    })
  } catch (error) {
    console.error('[Menu Bulk Delete] Unexpected error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}
