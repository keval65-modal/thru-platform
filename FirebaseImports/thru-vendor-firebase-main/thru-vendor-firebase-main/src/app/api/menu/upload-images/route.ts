'use server'

import { NextResponse } from 'next/server'

import { extractMenuFromImagePage } from '@/ai/flows/extract-menu-flow'
import { getSession } from '@/lib/auth'
import { mapExtractedItemsToRows, formatMenuExtractionError } from '@/lib/menu-import'
import { getSupabaseServiceDbClient } from '@/lib/supabase-auth'
import { isMenuUploadEnabled } from '@/lib/vendor-features'

const MAX_PAGES = 10
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

type PageInput = {
  pageNumber: number
  dataUri: string
  fileName?: string
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session.isAuthenticated || !session.id) {
      return NextResponse.json(
        { error: 'You must be logged in to upload menu photos.' },
        { status: 401 },
      )
    }

    if (!isMenuUploadEnabled(session.storeCategory)) {
      return NextResponse.json(
        { error: 'Menu upload is only available for Restaurants, Cafes, and Bakeries.' },
        { status: 403 },
      )
    }

    const body = await request.json().catch(() => null as null | Record<string, unknown>)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 })
    }

    const replaceExisting =
      typeof body.replaceExisting === 'boolean'
        ? body.replaceExisting
        : body.replaceExisting === 'true'

    const rawPages = Array.isArray(body.pages) ? body.pages : []
    if (!rawPages.length) {
      return NextResponse.json(
        { error: 'Add at least one menu page photo before scanning.' },
        { status: 400 },
      )
    }
    if (rawPages.length > MAX_PAGES) {
      return NextResponse.json(
        { error: `You can upload up to ${MAX_PAGES} pages at a time.` },
        { status: 400 },
      )
    }

    const pages: PageInput[] = []
    for (let i = 0; i < rawPages.length; i++) {
      const entry = rawPages[i]
      if (!entry || typeof entry !== 'object') continue
      const dataUri = typeof (entry as PageInput).dataUri === 'string' ? (entry as PageInput).dataUri : ''
      const pageNumber =
        typeof (entry as PageInput).pageNumber === 'number'
          ? (entry as PageInput).pageNumber
          : i + 1
      const fileName =
        typeof (entry as PageInput).fileName === 'string' ? (entry as PageInput).fileName : `Page ${pageNumber}`

      if (!dataUri.match(/^data:image\/(jpeg|png|webp);base64,/)) {
        return NextResponse.json(
          { error: `Page ${pageNumber}: unsupported image format. Use JPG, PNG, or WebP.` },
          { status: 415 },
        )
      }

      const mimeType = dataUri.slice(5, dataUri.indexOf(';'))
      if (!SUPPORTED_IMAGE_TYPES.has(mimeType)) {
        return NextResponse.json(
          { error: `Page ${pageNumber}: unsupported image type.` },
          { status: 415 },
        )
      }

      const base64 = dataUri.split(',')[1] || ''
      const approxBytes = Math.ceil((base64.length * 3) / 4)
      if (approxBytes > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { error: `Page ${pageNumber} is too large. Please retake at a lower resolution.` },
          { status: 413 },
        )
      }

      pages.push({ pageNumber, dataUri, fileName })
    }

    if (!pages.length) {
      return NextResponse.json({ error: 'No valid page images were provided.' }, { status: 400 })
    }

    const pageResults: Array<{
      pageNumber: number
      fileName: string
      isReadable: boolean
      readabilityIssue?: string
      itemsFound: number
    }> = []

    const allExtractedItems: ReturnType<typeof mapExtractedItemsToRows> = []

    for (const page of pages) {
      try {
        const extraction = await extractMenuFromImagePage({
          vendorId: session.id,
          pageNumber: page.pageNumber,
          menuImageDataUri: page.dataUri,
        })

        pageResults.push({
          pageNumber: page.pageNumber,
          fileName: page.fileName ?? `Page ${page.pageNumber}`,
          isReadable: extraction.isReadable,
          readabilityIssue: extraction.readabilityIssue,
          itemsFound: extraction.extractedItems.length,
        })

        if (extraction.isReadable && extraction.extractedItems.length > 0) {
          allExtractedItems.push(...mapExtractedItemsToRows(extraction.extractedItems, session.id))
        }
      } catch (error) {
        console.error(`[Menu Image Upload] Failed on page ${page.pageNumber}:`, error)
        pageResults.push({
          pageNumber: page.pageNumber,
          fileName: page.fileName ?? `Page ${page.pageNumber}`,
          isReadable: false,
          readabilityIssue: 'We could not process this photo. Please retake it in better lighting.',
          itemsFound: 0,
        })
      }
    }

    const unreadablePages = pageResults.filter((p) => !p.isReadable)
    const readableWithItems = pageResults.filter((p) => p.isReadable && p.itemsFound > 0)

    if (!allExtractedItems.length) {
      const issues = unreadablePages
        .map((p) => `Page ${p.pageNumber}: ${p.readabilityIssue ?? 'Not readable'}`)
        .join(' ')

      return NextResponse.json(
        {
          error: unreadablePages.length
            ? `No menu items could be extracted. ${issues}`
            : 'No menu items were detected in the uploaded photos.',
          pageResults,
          unreadablePages,
        },
        { status: 422 },
      )
    }

    const supabase = getSupabaseServiceDbClient()
    if (!supabase) {
      return NextResponse.json(
        {
          error:
            'Menu upload is not configured on the server. Please set SUPABASE_SERVICE_ROLE_KEY in your deployment environment.',
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
        console.error('[Menu Image Upload] Failed to delete previous menu items:', deleteError)
        return NextResponse.json(
          { error: 'Could not reset existing menu items before import.' },
          { status: 500 },
        )
      }
    }

    const { error: insertError } = await supabase.from('menu_items').insert(allExtractedItems)

    if (insertError) {
      console.error('[Menu Image Upload] Supabase insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to save extracted menu items. Please try again.' },
        { status: 500 },
      )
    }

    const warning =
      unreadablePages.length > 0
        ? `${unreadablePages.length} page(s) could not be read and were skipped.`
        : undefined

    return NextResponse.json({
      inserted: allExtractedItems.length,
      pagesProcessed: pageResults.length,
      readablePages: readableWithItems.length,
      unreadablePages,
      pageResults,
      replaced: replaceExisting,
      warning,
      message: warning
        ? `Imported ${allExtractedItems.length} items. ${warning}`
        : `Imported ${allExtractedItems.length} items from ${readableWithItems.length} page(s).`,
    })
  } catch (error) {
    console.error('[Menu Image Upload] Unexpected error:', error)
    return NextResponse.json(
      { error: formatMenuExtractionError(error) },
      { status: 500 },
    )
  }
}
