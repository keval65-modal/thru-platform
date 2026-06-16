import type { ExtractMenuOutput } from '@/ai/flows/extract-menu-flow'

export function parsePriceString(raw: string | undefined | null): number {
  if (!raw) return 0
  const cleaned = raw.replace(/[^0-9.]/g, '')
  const parsed = Number.parseFloat(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

/** Turn provider/API failures into short messages suitable for vendor toasts. */
export function formatMenuExtractionError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()

  if (lower.includes('prepayment credits') || lower.includes('credits are depleted')) {
    return 'Menu AI scanning is unavailable because Google AI credits are exhausted. Please add items manually for now, or contact Thru support.'
  }
  if (lower.includes('429') && (lower.includes('google') || lower.includes('gemini'))) {
    return 'Menu AI scanning is temporarily rate-limited. Please wait a minute and try again, or add items manually.'
  }
  if (lower.includes('openai_api_key is not configured')) {
    return 'Menu AI scanning is not configured on the server (OpenAI). Please contact Thru support.'
  }
  if (lower.includes('google_ai_api_key is not configured')) {
    return 'Menu AI scanning is not configured on the server (Google AI). Please contact Thru support.'
  }
  if (lower.includes('invalid json') || lower.includes('failed validation')) {
    return 'We could not read this file as a menu. Try a clearer PDF, use Scan Menu Photos, or add items manually.'
  }
  if (lower.includes('no readable menu items')) {
    return 'No menu items were found in this file. Please upload an actual restaurant menu.'
  }

  if (message.length > 0 && message.length <= 220) {
    return message
  }

  return 'Unable to process this menu right now. Please try again shortly or add items manually.'
}

export function mapExtractedItemsToRows(
  extractedItems: ExtractMenuOutput['extractedItems'],
  vendorId: string,
) {
  return extractedItems
    .map((item) => {
      const name = item.itemName?.trim()
      if (!name) return null

      return {
        vendor_id: vendorId,
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
}
