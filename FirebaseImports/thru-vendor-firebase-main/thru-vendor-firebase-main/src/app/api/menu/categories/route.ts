'use server'

import { NextResponse } from 'next/server'

import { getSession } from '@/lib/auth'
import { getSupabaseServiceDbClient } from '@/lib/supabase-auth'
import { isMenuUploadEnabled } from '@/lib/vendor-features'

function normalizeCategoryName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function uniqueSorted(names: string[]): string[] {
  return [...new Set(names.map((n) => n.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  )
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

async function loadMergedCategories(vendorId: string) {
  const supabase = getSupabaseServiceDbClient()
  if (!supabase) {
    return { supabase: null, categories: null, error: 'Menu management is not configured on the server.' }
  }

  const [{ data: vendor, error: vendorError }, { data: items, error: itemsError }] =
    await Promise.all([
      supabase.from('vendors').select('menu_categories').eq('id', vendorId).maybeSingle(),
      supabase.from('menu_items').select('category').eq('vendor_id', vendorId),
    ])

  if (vendorError) {
    console.warn('[Menu Categories] Vendor fetch error (using item categories only):', vendorError.message)
  }

  if (itemsError) {
    console.error('[Menu Categories] Items fetch error:', itemsError)
    return { supabase, categories: null, error: 'Failed to load categories.' }
  }

  const saved = Array.isArray(vendor?.menu_categories)
    ? vendor.menu_categories.filter((n): n is string => typeof n === 'string')
    : []

  const fromItems = (items ?? [])
    .map((row) => (typeof row.category === 'string' ? row.category.trim() : ''))
    .filter(Boolean)

  return { supabase, categories: uniqueSorted([...saved, ...fromItems]), error: null }
}

async function saveCategoryList(vendorId: string, categories: string[]) {
  const supabase = getSupabaseServiceDbClient()
  if (!supabase) {
    return { error: 'Menu management is not configured on the server.' }
  }

  const { error } = await supabase
    .from('vendors')
    .update({ menu_categories: uniqueSorted(categories) })
    .eq('id', vendorId)

  if (error) {
    console.error('[Menu Categories] Save error:', error)
    return { error: 'Failed to save categories.' }
  }

  return { error: null }
}

export async function GET() {
  const { session, error: sessionError } = await requireMenuSession()
  if (!session || sessionError) return sessionError

  const { categories, error } = await loadMergedCategories(session.id)
  if (error || !categories) {
    return NextResponse.json({ error: error || 'Failed to load categories.' }, { status: 500 })
  }

  return NextResponse.json({ categories })
}

export async function POST(request: Request) {
  const { session, error: sessionError } = await requireMenuSession()
  if (!session || sessionError) return sessionError

  const body = await request.json().catch(() => null)
  const name = normalizeCategoryName(body?.name)
  if (!name) {
    return NextResponse.json({ error: 'Category name is required.' }, { status: 400 })
  }

  const { categories, error } = await loadMergedCategories(session.id)
  if (error || !categories) {
    return NextResponse.json({ error: error || 'Failed to load categories.' }, { status: 500 })
  }

  if (categories.some((c) => c.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: 'This category already exists.' }, { status: 409 })
  }

  const next = uniqueSorted([...categories, name])
  const saveResult = await saveCategoryList(session.id, next)
  if (saveResult.error) {
    return NextResponse.json(
      {
        error:
          saveResult.error +
          ' Run src/lib/supabase/menu-schema.sql in Supabase to add vendors.menu_categories.',
      },
      { status: 500 },
    )
  }

  return NextResponse.json({ categories: next, message: `Category "${name}" added.` })
}

export async function PATCH(request: Request) {
  const { session, error: sessionError } = await requireMenuSession()
  if (!session || sessionError) return sessionError

  const body = await request.json().catch(() => null)
  const oldName = normalizeCategoryName(body?.oldName)
  const newName = normalizeCategoryName(body?.newName)

  if (!oldName || !newName) {
    return NextResponse.json({ error: 'Old and new category names are required.' }, { status: 400 })
  }

  if (oldName.toLowerCase() === newName.toLowerCase()) {
    return NextResponse.json({ categories: [newName], message: 'No changes made.' })
  }

  const { supabase, categories, error } = await loadMergedCategories(session.id)
  if (error || !categories || !supabase) {
    return NextResponse.json({ error: error || 'Failed to load categories.' }, { status: 500 })
  }

  if (!categories.some((c) => c.toLowerCase() === oldName.toLowerCase())) {
    return NextResponse.json({ error: 'Category not found.' }, { status: 404 })
  }

  if (categories.some((c) => c.toLowerCase() === newName.toLowerCase() && c !== oldName)) {
    return NextResponse.json({ error: 'A category with that name already exists.' }, { status: 409 })
  }

  const next = uniqueSorted(
    categories.map((c) => (c.toLowerCase() === oldName.toLowerCase() ? newName : c)),
  )

  const { error: itemsError } = await supabase
    .from('menu_items')
    .update({ category: newName })
    .eq('vendor_id', session.id)
    .eq('category', oldName)

  if (itemsError) {
    console.error('[Menu Categories] Rename items error:', itemsError)
    return NextResponse.json({ error: 'Failed to rename category on menu items.' }, { status: 500 })
  }

  const saveResult = await saveCategoryList(session.id, next)
  if (saveResult.error) {
    return NextResponse.json({ error: saveResult.error }, { status: 500 })
  }

  return NextResponse.json({
    categories: next,
    message: `Renamed "${oldName}" to "${newName}".`,
  })
}

export async function DELETE(request: Request) {
  const { session, error: sessionError } = await requireMenuSession()
  if (!session || sessionError) return sessionError

  const body = await request.json().catch(() => null)
  const name = normalizeCategoryName(body?.name)
  if (!name) {
    return NextResponse.json({ error: 'Category name is required.' }, { status: 400 })
  }

  const { supabase, categories, error } = await loadMergedCategories(session.id)
  if (error || !categories || !supabase) {
    return NextResponse.json({ error: error || 'Failed to load categories.' }, { status: 500 })
  }

  const { count, error: countError } = await supabase
    .from('menu_items')
    .select('id', { count: 'exact', head: true })
    .eq('vendor_id', session.id)
    .eq('category', name)

  if (countError) {
    console.error('[Menu Categories] Count error:', countError)
    return NextResponse.json({ error: 'Failed to check category usage.' }, { status: 500 })
  }

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Remove or reassign all items in this category before deleting it.' },
      { status: 409 },
    )
  }

  const next = categories.filter((c) => c.toLowerCase() !== name.toLowerCase())
  const saveResult = await saveCategoryList(session.id, next)
  if (saveResult.error) {
    return NextResponse.json({ error: saveResult.error }, { status: 500 })
  }

  return NextResponse.json({
    categories: next,
    message: `Category "${name}" removed.`,
  })
}
