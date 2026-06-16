'use server'

import { NextResponse } from 'next/server'

import { getSession } from '@/lib/auth'
import { uploadMenuItemImage } from '@/lib/supabase-auth'
import { isMenuUploadEnabled } from '@/lib/vendor-features'

const MAX_IMAGE_BYTES = 8 * 1024 * 1024
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
    const image = formData.get('image')
    const itemId = formData.get('itemId')

    if (!(image instanceof File)) {
      return NextResponse.json({ error: 'Please select an image to upload.' }, { status: 400 })
    }

    if (image.size === 0) {
      return NextResponse.json({ error: 'The selected image is empty.' }, { status: 400 })
    }

    if (image.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: 'Image is too large. Please use a photo under 8 MB.' },
        { status: 413 },
      )
    }

    const mimeType = image.type || 'image/jpeg'
    if (!SUPPORTED_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: 'Unsupported image type. Use JPG, PNG, or WebP.' },
        { status: 415 },
      )
    }

    const stableItemId = typeof itemId === 'string' && itemId.length > 0 ? itemId : undefined
    const result = await uploadMenuItemImage(session.id, image, stableItemId)

    if (!result.success || !result.url) {
      return NextResponse.json(
        { error: result.error || 'Failed to upload image.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ url: result.url })
  } catch (error) {
    console.error('[Menu Item Image] Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to upload image.' }, { status: 500 })
  }
}
