'use server'

import { Buffer } from 'buffer'
import { NextResponse } from 'next/server'

import { extractMenuData } from '@/ai/flows/extract-menu-flow'
import { deleteMenuPdfFromOpenAI, uploadMenuPdfToOpenAI } from '@/ai/openai-client'
import { getSession } from '@/lib/auth'
import { getSupabaseDbClient } from '@/lib/supabase-auth'

const MENU_PDF_BUCKET =
  process.env.SUPABASE_MENU_BUCKET ||
  process.env.NEXT_PUBLIC_SUPABASE_MENU_BUCKET ||
  'vendor-menu-pdfs'

const MAX_PDF_SIZE_BYTES = 25 * 1024 * 1024 // 25 MB hard cap (Supabase storage limit is higher, but we keep it reasonable)
const SUPPORTED_CONTENT_TYPES = new Set(['application/pdf'])

function parsePriceString(raw: string | undefined | null): number {
  if (!raw) return 0
  const cleaned = raw.replace(/[^0-9.]/g, '')
  const parsed = Number.parseFloat(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function POST(request: Request) {
  let openAiFileId: string | null = null

  try {
    if (!MENU_PDF_BUCKET) {
      return NextResponse.json(
        { error: 'Menu upload bucket is not configured on the server.' },
        { status: 500 }
      )
    }

    const session = await getSession()
    if (!session.isAuthenticated || !session.id) {
      return NextResponse.json(
        { error: 'You must be logged in to upload menu files.' },
        { status: 401 }
      )
    }

    const body = await request
      .json()
      .catch(() => null as null | Record<string, unknown>)

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request payload. Expected JSON body.' },
        { status: 400 }
      )
    }

    const storagePath = typeof body.storagePath === 'string' ? body.storagePath : ''
    const replaceExisting =
      typeof body.replaceExisting === 'boolean'
        ? body.replaceExisting
        : body.replaceExisting === 'true'
    const fileName = typeof body.fileName === 'string' ? body.fileName : 'menu.pdf'
    const contentType =
      typeof body.contentType === 'string' && body.contentType.trim().length > 0
        ? body.contentType
        : 'application/pdf'

    if (!storagePath) {
      return NextResponse.json(
        { error: 'Missing storage path for uploaded PDF.' },
        { status: 400 }
      )
    }

    if (!SUPPORTED_CONTENT_TYPES.has(contentType)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Only PDF menus are allowed.' },
        { status: 415 }
      )
    }

    const supabase = getSupabaseDbClient()

    const { data: downloadedPdf, error: downloadError } = await supabase.storage
      .from(MENU_PDF_BUCKET)
      .download(storagePath)

    if (downloadError || !downloadedPdf) {
      console.error('[Menu Upload] Failed to download PDF from storage:', downloadError)
      return NextResponse.json(
        { error: 'Unable to download the uploaded PDF. Please try again.' },
        { status: 502 }
      )
    }

    const arrayBuffer = await downloadedPdf.arrayBuffer()
    if (arrayBuffer.byteLength === 0) {
      return NextResponse.json(
        { error: 'The uploaded PDF appears to be empty.' },
        { status: 400 }
      )
    }

    if (arrayBuffer.byteLength > MAX_PDF_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File is too large. Please upload a PDF smaller than 25 MB.' },
        { status: 413 }
      )
    }

    const pdfBuffer = Buffer.from(arrayBuffer)
    openAiFileId = await uploadMenuPdfToOpenAI(pdfBuffer, fileName, contentType)

    const extraction = await extractMenuData({
      menuFileId: openAiFileId,
      vendorId: session.id,
    })

    const extractedItems = extraction.extractedItems ?? []

    if (!extractedItems.length) {
      return NextResponse.json(
        { error: 'No readable menu items were detected in this PDF.' },
        { status: 422 }
      )
    }

    const itemsToInsert = extractedItems
      .map((item) => {
        const name = item.itemName?.trim()
        if (!name) {
          return null
        }

        return {
          vendor_id: session.id,
          name,
          description: item.description?.trim() || null,
          price: parsePriceString(item.price),
          category: item.category?.trim() || 'Other',
          image_url: null,
          is_available: true,
          is_veg: false,
          preparation_time: null,
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))

    if (!itemsToInsert.length) {
      return NextResponse.json(
        { error: 'We could not extract any valid items with names from this PDF.' },
        { status: 422 }
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
          { status: 500 }
        )
      }
    }

    const { error: insertError } = await supabase.from('menu_items').insert(itemsToInsert)

    if (insertError) {
      console.error('[Menu Upload] Supabase insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to save extracted menu items. Please try again.' },
        { status: 500 }
      )
    }

    // Best-effort cleanup of the uploaded PDF to avoid unused storage
    await supabase.storage.from(MENU_PDF_BUCKET).remove([storagePath]).catch((error) => {
      console.warn('[Menu Upload] Failed to remove processed PDF from storage:', error?.message)
    })

    if (openAiFileId) {
      await deleteMenuPdfFromOpenAI(openAiFileId)
      openAiFileId = null
    }

    return NextResponse.json({
      inserted: itemsToInsert.length,
      totalDetected: extractedItems.length,
      replaced: replaceExisting,
      fileName,
      message: `Imported ${itemsToInsert.length} items from ${fileName}.`,
    })
  } catch (error) {
    if (openAiFileId) {
      await deleteMenuPdfFromOpenAI(openAiFileId).catch(() => {})
    }

    console.error('[Menu Upload] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Unable to process this menu right now. Please try again shortly.' },
      { status: 500 }
    )
  }
}
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'buffer';

import { extractMenuData } from '@/ai/flows/extract-menu-flow';
import { getSession } from '@/lib/auth';
import { getSupabaseDbClient } from '@/lib/supabase-auth';

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const SUPPORTED_MIME_TYPES = new Set(['application/pdf']);

function parsePriceString(raw: string | undefined | null): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9.]/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isAuthenticated || !session.id) {
      return NextResponse.json(
        { error: 'You need to be logged in to upload menu files.' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('menuPdf');
    const replaceExisting = formData.get('replaceExisting') === 'true';

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Please attach a PDF menu file.' },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: 'The selected file is empty. Please pick a valid PDF.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_PDF_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File is too large. Please upload a PDF smaller than 10 MB.' },
        { status: 413 }
      );
    }

    if (file.type && !SUPPORTED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Only PDF menus are allowed.' },
        { status: 415 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    const dataUri = `data:${file.type || 'application/pdf'};base64,${base64}`;

    const extraction = await extractMenuData({
      menuDataUri: dataUri,
      vendorId: session.id,
    });

    const extractedItems = extraction.extractedItems ?? [];
    if (!extractedItems.length) {
      return NextResponse.json(
        { error: 'No readable menu items were detected in this PDF.' },
        { status: 422 }
      );
    }

    const itemsToInsert = extractedItems
      .map((item) => {
        const name = item.itemName?.trim();
        if (!name) {
          return null;
        }

        return {
          vendor_id: session.id,
          name,
          description: item.description?.trim() || null,
          price: parsePriceString(item.price),
          category: item.category?.trim() || 'Other',
          image_url: null,
          is_available: true,
          is_veg: false,
          preparation_time: null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (!itemsToInsert.length) {
      return NextResponse.json(
        { error: 'We could not extract any valid items with names from this PDF.' },
        { status: 422 }
      );
    }

    const supabase = getSupabaseDbClient();

    if (replaceExisting) {
      const { error: deleteError } = await supabase
        .from('menu_items')
        .delete()
        .eq('vendor_id', session.id);

      if (deleteError) {
        console.error('[Menu Upload] Failed to delete previous menu items:', deleteError);
        return NextResponse.json(
          { error: 'Could not reset existing menu items before import.' },
          { status: 500 }
        );
      }
    }

    const { error: insertError } = await supabase
      .from('menu_items')
      .insert(itemsToInsert);

    if (insertError) {
      console.error('[Menu Upload] Supabase insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save extracted menu items. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      inserted: itemsToInsert.length,
      totalDetected: extractedItems.length,
      replaced: replaceExisting,
      message: `Imported ${itemsToInsert.length} items from your PDF.`,
    });
  } catch (error) {
    console.error('[Menu Upload] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Unable to process this menu right now. Please try again shortly.' },
      { status: 500 }
    );
  }
}




