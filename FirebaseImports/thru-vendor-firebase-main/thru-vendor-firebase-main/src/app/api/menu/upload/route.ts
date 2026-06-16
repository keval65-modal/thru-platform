'use server'

import { Buffer } from 'buffer'
import { NextResponse } from 'next/server'

import { extractMenuData } from '@/ai/flows/extract-menu-flow'
import { getSession } from '@/lib/auth'
import { mapExtractedItemsToRows } from '@/lib/menu-import'
import { getSupabaseServiceDbClient } from '@/lib/supabase-auth'
import { isMenuUploadEnabled } from '@/lib/vendor-features'

const MAX_PDF_SIZE_BYTES = 25 * 1024 * 1024
const SUPPORTED_CONTENT_TYPES = new Set(['application/pdf'])

function requireServiceClient() {
  const supabase = getSupabaseServiceDbClient()
  if (!supabase) {
    return {
      supabase: null,
      error: NextResponse.json(
        {
          error:
            'Menu upload is not configured on the server. Please set SUPABASE_SERVICE_ROLE_KEY in your deployment environment.',
        },
        { status: 500 },
      ),
    }
  }
  return { supabase, error: null }
}

async function readPdfFromRequest(request: Request): Promise<
  | { ok: true; pdfBuffer: Buffer; fileName: string; replaceExisting: boolean }
  | { ok: false; response: NextResponse }
> {
  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const file = formData.get('menuPdf')
    const replaceExisting = formData.get('replaceExisting') === 'true'

    if (!(file instanceof File)) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Please attach a PDF menu file.' }, { status: 400 }),
      }
    }

    if (file.size === 0) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'The selected PDF is empty.' }, { status: 400 }),
      }
    }

    if (file.size > MAX_PDF_SIZE_BYTES) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'File is too large. Please upload a PDF smaller than 25 MB.' },
          { status: 413 },
        ),
      }
    }

    const mimeType = file.type || 'application/pdf'
    if (mimeType && !SUPPORTED_CONTENT_TYPES.has(mimeType)) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Unsupported file type. Only PDF menus are allowed.' },
          { status: 415 },
        ),
      }
    }

    const pdfBuffer = Buffer.from(await file.arrayBuffer())
    return {
      ok: true,
      pdfBuffer,
      fileName: file.name || 'menu.pdf',
      replaceExisting,
    }
  }

  const body = await request.json().catch(() => null as null | Record<string, unknown>)
  if (!body || typeof body !== 'object') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Invalid request. Send multipart form data with a menuPdf file.' },
        { status: 400 },
      ),
    }
  }

  const storagePath = typeof body.storagePath === 'string' ? body.storagePath : ''
  const replaceExisting =
    typeof body.replaceExisting === 'boolean'
      ? body.replaceExisting
      : body.replaceExisting === 'true'
  const fileName = typeof body.fileName === 'string' ? body.fileName : 'menu.pdf'
  const mimeType =
    typeof body.contentType === 'string' && body.contentType.trim().length > 0
      ? body.contentType
      : 'application/pdf'

  if (!storagePath) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Missing storage path for uploaded PDF.' }, { status: 400 }),
    }
  }

  if (!SUPPORTED_CONTENT_TYPES.has(mimeType)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Unsupported file type. Only PDF menus are allowed.' },
        { status: 415 },
      ),
    }
  }

  const { supabase, error: serviceError } = requireServiceClient()
  if (!supabase || serviceError) {
    return { ok: false, response: serviceError! }
  }

  const bucket =
    process.env.SUPABASE_MENU_BUCKET ||
    process.env.NEXT_PUBLIC_SUPABASE_MENU_BUCKET ||
    'vendor-menu-pdfs'

  const { data: downloadedPdf, error: downloadError } = await supabase.storage
    .from(bucket)
    .download(storagePath)

  if (downloadError || !downloadedPdf) {
    console.error('[Menu Upload] Failed to download PDF from storage:', downloadError)
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Unable to download the uploaded PDF. Please try again.' },
        { status: 502 },
      ),
    }
  }

  const arrayBuffer = await downloadedPdf.arrayBuffer()
  const pdfBuffer = Buffer.from(arrayBuffer)

  await supabase.storage.from(bucket).remove([storagePath]).catch((err) => {
    console.warn('[Menu Upload] Failed to remove legacy storage file:', err?.message)
  })

  return { ok: true, pdfBuffer, fileName, replaceExisting }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session.isAuthenticated || !session.id) {
      return NextResponse.json(
        { error: 'You must be logged in to upload menu files.' },
        { status: 401 },
      )
    }

    if (!isMenuUploadEnabled(session.storeCategory)) {
      return NextResponse.json(
        { error: 'Menu upload is only available for Restaurants, Cafes, and Bakeries.' },
        { status: 403 },
      )
    }

    const { supabase, error: serviceError } = requireServiceClient()
    if (!supabase || serviceError) {
      return serviceError
    }

    const pdfInput = await readPdfFromRequest(request)
    if (!pdfInput.ok) {
      return pdfInput.response
    }

    const { pdfBuffer, fileName, replaceExisting } = pdfInput

    if (pdfBuffer.byteLength === 0) {
      return NextResponse.json({ error: 'The uploaded PDF appears to be empty.' }, { status: 400 })
    }

    if (pdfBuffer.byteLength > MAX_PDF_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File is too large. Please upload a PDF smaller than 25 MB.' },
        { status: 413 },
      )
    }

    const menuText = await extractTextFromPdfBuffer(pdfBuffer).catch((error) => {
      console.error('[Menu Upload] Failed to parse PDF text:', error)
      return null
    })

    const extraction = await (async () => {
      if (menuText && menuText.trim().length >= 50) {
        return await extractMenuData({ menuText, vendorId: session.id })
      }

      const menuDataUri = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`
      return await extractMenuData({ menuDataUri, vendorId: session.id })
    })()

    const extractedItems = extraction.extractedItems ?? []

    if (!extractedItems.length) {
      return NextResponse.json(
        { error: 'No readable menu items were detected in this PDF.' },
        { status: 422 },
      )
    }

    const itemsToInsert = mapExtractedItemsToRows(extractedItems, session.id)

    if (!itemsToInsert.length) {
      return NextResponse.json(
        { error: 'We could not extract any valid items with names from this PDF.' },
        { status: 422 },
      )
    }

    if (replaceExisting) {
      const { error: deleteError } = await supabase
        .from('menu_items')
        .delete()
        .eq('vendor_id', session.id)

      if (deleteError) {
        console.error('[Menu Upload] Failed to delete previous menu items:', deleteError)
        return NextResponse.json(
          { error: 'Could not reset existing menu items before import.' },
          { status: 500 },
        )
      }
    }

    const { error: insertError } = await supabase.from('menu_items').insert(itemsToInsert)

    if (insertError) {
      console.error('[Menu Upload] Supabase insert error:', insertError)
      const lower = insertError.message?.toLowerCase() ?? ''
      const hint =
        lower.includes('row-level security') || lower.includes('policy')
          ? ' Ensure SUPABASE_SERVICE_ROLE_KEY is set on the server.'
          : ''
      return NextResponse.json(
        { error: `Failed to save extracted menu items.${hint}` },
        { status: 500 },
      )
    }

    return NextResponse.json({
      inserted: itemsToInsert.length,
      totalDetected: extractedItems.length,
      replaced: replaceExisting,
      fileName,
      message: `Imported ${itemsToInsert.length} items from ${fileName}.`,
    })
  } catch (error) {
    console.error('[Menu Upload] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Unable to process this menu right now. Please try again shortly.' },
      { status: 500 },
    )
  }
}

async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const { default: PDFParser } = await import('pdf2json')

  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser()

    pdfParser.on('pdfParser_dataError', (err: any) => {
      reject(err?.parserError ?? err)
    })

    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
        const pages = pdfData?.formImage?.Pages ?? []
        const text = pages
          .map((page: any) =>
            (page.Texts ?? [])
              .map((textItem: any) =>
                decodeURIComponent(
                  (textItem.R ?? [])
                    .map((token: any) => token?.T ?? '')
                    .join(''),
                ),
              )
              .join(' '),
          )
          .join('\n')
          .trim()

        resolve(text)
      } catch (error) {
        reject(error)
      }
    })

    pdfParser.parseBuffer(buffer)
  })
}
