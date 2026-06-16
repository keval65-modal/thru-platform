import type { ExtractMenuOutput } from '@/ai/flows/extract-menu-flow'

export function parsePriceString(raw: string | undefined | null): number {
  if (!raw) return 0
  const cleaned = raw.replace(/[^0-9.]/g, '')
  const parsed = Number.parseFloat(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
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
