'use server'

import { NextResponse } from 'next/server'

import { getSession } from '@/lib/auth'
import { getSupabaseServiceDbClient, uploadMenuItemImage } from '@/lib/supabase-auth'
import { isMenuUploadEnabled } from '@/lib/vendor-features'

const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_BULK_IMAGES = 50
const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session.isAuthenticated || !session.id) {
      return NextResponse.json({ error: 'You must be logged in to upload images.' }, { status: 401 })
    }

    if (!isMenuUploadEnabled(session.storeCategory)) {
      return NextResponse.json(
        { error: 'Menu management is only available for Restaurants, Cafes, and Bakeries.' },
        { status: 403 },
      )
    }

    const formData = await request.formData()
    const itemIdsRaw = formData.get('itemIds')
    if (typeof itemIdsRaw !== 'string') {
      return NextResponse.json({ error: 'Item ids are required.' }, { status: 400 })
    }

    let itemIds: string[]
    try {
      itemIds = JSON.parse(itemIdsRaw)
    } catch {
      return NextResponse.json({ error: 'Invalid item ids payload.' }, { status: 400 })
    }

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'Select at least one item.' }, { status: 400 })
    }

    if (itemIds.length > MAX_BULK_IMAGES) {
      return NextResponse.json(
        { error: `You can upload photos for up to ${MAX_BULK_IMAGES} items at a time.` },
        { status: 400 },
      )
    }

    const images = formData.getAll('images').filter((entry): entry is File => entry instanceof File)
    if (images.length !== itemIds.length) {
      return NextResponse.json(
        {
          error: `Provide exactly ${itemIds.length} photo(s) — one for each selected item (you chose ${images.length}).`,
        },
        { status: 400 },
      )
    }

    const supabase = getSupabaseServiceDbClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Menu management is not configured on the server.' },
        { status: 500 },
      )
    }

    const results: Array<{ itemId: string; url: string }> = []
    const failures: Array<{ itemId: string; error: string }> = []

    for (let i = 0; i < itemIds.length; i++) {
      const itemId = itemIds[i]
      const image = images[i]

      if (typeof itemId !== 'string' || !itemId) {
        failures.push({ itemId: String(itemId), error: 'Invalid item id.' })
        continue
      }

      if (image.size === 0) {
        failures.push({ itemId, error: 'Empty image file.' })
        continue
      }

      if (image.size > MAX_IMAGE_BYTES) {
        failures.push({ itemId, error: 'Image exceeds 8 MB limit.' })
        continue
      }

      const mimeType = image.type || 'image/jpeg'
      if (!SUPPORTED_TYPES.has(mimeType)) {
        failures.push({ itemId, error: 'Unsupported image type.' })
        continue
      }

      const upload = await uploadMenuItemImage(session.id, image, itemId)
      if (!upload.success || !upload.url) {
        failures.push({ itemId, error: upload.error || 'Upload failed.' })
        continue
      }

      const { error: updateError } = await supabase
        .from('menu_items')
        .update({ image_url: upload.url })
        .eq('id', itemId)
        .eq('vendor_id', session.id)

      if (updateError) {
        failures.push({ itemId, error: 'Uploaded but failed to save to menu item.' })
        continue
      }

      results.push({ itemId, url: upload.url })
    }

    if (!results.length) {
      return NextResponse.json(
        { error: failures[0]?.error || 'No photos were uploaded.', failures },
        { status: 500 },
      )
    }

    return NextResponse.json({
      updated: results.length,
      results,
      failures: failures.length ? failures : undefined,
      message:
        failures.length > 0
          ? `Updated ${results.length} item(s). ${failures.length} failed.`
          : `Updated photos for ${results.length} item(s).`,
    })
  } catch (error) {
    console.error('[Menu Item Image Bulk] Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to upload images.' }, { status: 500 })
  }
}
