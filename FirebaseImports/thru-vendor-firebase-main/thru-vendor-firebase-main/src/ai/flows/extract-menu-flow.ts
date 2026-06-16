import { z } from 'zod'

import { openaiClient, openAiMenuModel, openAiMenuVisionModel } from '@/ai/openai-client'
import { ai, menuExtractionModel } from '@/ai/genkit'

const MenuItemSchema = z.object({
  category: z
    .string()
    .describe('The category of the menu item (e.g., Appetizers, Main Courses, Desserts).'),
  itemName: z.string().describe('The name of the menu item.'),
  price: z.string().describe('The price of the menu item (as a string, e.g., "$10.99", "£8.50").'),
  description: z.string().optional().describe('A brief description of the menu item, if available.'),
})

const ExtractMenuInputSchema = z
  .object({
    vendorId: z.string().describe('The ID of the vendor uploading the menu.'),
    menuText: z
      .string()
      .min(1, 'Menu text cannot be empty.')
      .optional()
      .describe('Plain text content extracted from the uploaded menu PDF.'),
    // For "vision" / PDF-native extraction (Gemini can read PDFs).
    // Format: data:application/pdf;base64,....
    menuDataUri: z
      .string()
      .startsWith('data:application/pdf;base64,')
      .optional()
      .describe('PDF content as a base64 data URI for multimodal extraction.'),
  })
  .refine((v) => Boolean(v.menuText || v.menuDataUri), {
    message: 'Either menuText or menuDataUri must be provided.',
    path: ['menuText'],
  })
export type ExtractMenuInput = z.infer<typeof ExtractMenuInputSchema>

const ExtractMenuOutputSchema = z.object({
  extractedItems: z.array(MenuItemSchema).describe('An array of extracted menu items.'),
  rawText: z.string().optional().describe('Raw text extracted if structured parsing fails or as supplementary info.'),
})
export type ExtractMenuOutput = z.infer<typeof ExtractMenuOutputSchema>

const SYSTEM_PROMPT = `You are an expert menu parsing assistant. Given the text of a restaurant menu you must:
1. List every food or beverage item that a customer can order.
2. Preserve or infer sensible categories (Appetizers, Mains, Desserts, Drinks, etc.).
3. Capture the item name, the price text exactly as printed (currency symbols included), and any description if available.
4. Only respond with JSON matching the requested schema. No narrative text.`

const RESPONSE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['extractedItems'],
  properties: {
    extractedItems: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['category', 'itemName', 'price'],
        properties: {
          category: { type: 'string' },
          itemName: { type: 'string' },
          price: { type: 'string' },
          description: { type: 'string' },
        },
      },
    },
    rawText: { type: 'string' },
  },
}

const IMAGE_PAGE_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['isReadable', 'extractedItems'],
  properties: {
    isReadable: {
      type: 'boolean',
      description: 'True when the photo is clear enough to read menu text and prices.',
    },
    readabilityIssue: {
      type: 'string',
      description: 'When isReadable is false, a short explanation for the vendor.',
    },
    extractedItems: RESPONSE_JSON_SCHEMA.properties.extractedItems,
    rawText: { type: 'string' },
  },
}

const ExtractMenuImageInputSchema = z.object({
  vendorId: z.string(),
  pageNumber: z.number().int().positive().optional(),
  menuImageDataUri: z
    .string()
    .regex(/^data:image\/(jpeg|png|webp);base64,/, 'Expected a base64 image data URI.'),
})
export type ExtractMenuImageInput = z.infer<typeof ExtractMenuImageInputSchema>

const ExtractMenuPageOutputSchema = z.object({
  isReadable: z.boolean(),
  readabilityIssue: z.string().optional(),
  extractedItems: z.array(MenuItemSchema),
  rawText: z.string().optional(),
})
export type ExtractMenuPageOutput = z.infer<typeof ExtractMenuPageOutputSchema>

const IMAGE_READABILITY_PROMPT = `You are an expert menu OCR assistant reviewing a photo of a restaurant menu page.

First assess whether the image is readable enough to extract menu items:
- Mark isReadable false if the image is blurry, too dark, cropped badly, shows no menu text, is blank, or prices/names cannot be distinguished.
- When isReadable is false, set readabilityIssue to a helpful one-sentence explanation for the vendor (e.g. "Photo is too blurry — retake in good light and hold the camera steady.").
- When isReadable is true, extract every orderable food or beverage item with category, item name, price text, and description if visible.

Respond with JSON only. No markdown.`

const MAX_MENU_TEXT_CHARS = 120_000

export async function extractMenuData(input: ExtractMenuInput): Promise<ExtractMenuOutput> {
  const payload = ExtractMenuInputSchema.parse(input)

  const outputText = payload.menuText
    ? await extractViaOpenAiText(payload.vendorId, payload.menuText)
    : await extractViaGeminiPdf(payload.vendorId, payload.menuDataUri!)

  let parsed: unknown
  try {
    parsed = parseModelJson(outputText)
  } catch (error) {
    console.error('[extractMenuData] Failed parsing model output:', outputText)
    throw new Error('Menu extraction model returned invalid JSON.')
  }

  const validation = ExtractMenuOutputSchema.safeParse(parsed)
  if (!validation.success) {
    console.error('[extractMenuData] OpenAI output validation failed:', validation.error.flatten())
    throw new Error('Menu extraction result failed validation.')
  }

  console.log(
    `[extractMenuFlow] Successfully extracted ${validation.data.extractedItems.length} items for vendor: ${payload.vendorId}`,
  )

  return validation.data
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Try OpenAI text, Gemini PDF vision, then OpenAI PDF vision. */
export async function extractMenuFromPdfWithFallback(input: {
  vendorId: string
  menuText?: string | null
  menuDataUri: string
  fileName?: string
}): Promise<ExtractMenuOutput> {
  const failures: string[] = []
  const trimmedText = input.menuText?.trim() ?? ''

  if (trimmedText.length >= 10) {
    try {
      return await extractMenuData({ menuText: trimmedText, vendorId: input.vendorId })
    } catch (error) {
      failures.push(`OpenAI text: ${errorMessage(error)}`)
      console.warn('[extractMenuFlow] OpenAI text extraction failed:', error)
    }
  }

  try {
    return await extractMenuData({ menuDataUri: input.menuDataUri, vendorId: input.vendorId })
  } catch (error) {
    failures.push(`Gemini PDF: ${errorMessage(error)}`)
    console.warn('[extractMenuFlow] Gemini PDF extraction failed:', error)
  }

  if (openaiClient) {
    try {
      return await extractMenuDataFromOpenAiPdf(
        input.vendorId,
        input.menuDataUri,
        input.fileName ?? 'menu.pdf',
      )
    } catch (error) {
      failures.push(`OpenAI PDF: ${errorMessage(error)}`)
      console.warn('[extractMenuFlow] OpenAI PDF extraction failed:', error)
    }
  }

  throw new Error(failures[0] ?? 'All menu extraction providers failed.')
}

async function extractMenuDataFromOpenAiPdf(
  vendorId: string,
  menuDataUri: string,
  fileName: string,
): Promise<ExtractMenuOutput> {
  if (!openaiClient) {
    throw new Error('OPENAI_API_KEY is not configured. Unable to run OpenAI PDF extraction.')
  }

  const outputText = await extractViaOpenAiPdf(vendorId, menuDataUri, fileName)

  let parsed: unknown
  try {
    parsed = parseModelJson(outputText)
  } catch (error) {
    console.error('[extractMenuDataFromOpenAiPdf] Failed parsing model output:', outputText)
    throw new Error('OpenAI PDF extraction returned invalid JSON.')
  }

  const validation = ExtractMenuOutputSchema.safeParse(parsed)
  if (!validation.success) {
    console.error('[extractMenuDataFromOpenAiPdf] Output validation failed:', validation.error.flatten())
    throw new Error('OpenAI PDF extraction result failed validation.')
  }

  return validation.data
}

export async function extractMenuFromImagePage(
  input: ExtractMenuImageInput,
): Promise<ExtractMenuPageOutput> {
  const payload = ExtractMenuImageInputSchema.parse(input)
  const outputText = await extractViaGeminiImage(
    payload.vendorId,
    payload.menuImageDataUri,
    payload.pageNumber,
  )

  let parsed: unknown
  try {
    parsed = parseModelJson(outputText)
  } catch (error) {
    console.error('[extractMenuFromImagePage] Failed parsing model output:', outputText)
    throw new Error('Menu image extraction model returned invalid JSON.')
  }

  const validation = ExtractMenuPageOutputSchema.safeParse(parsed)
  if (!validation.success) {
    console.error('[extractMenuFromImagePage] Output validation failed:', validation.error.flatten())
    throw new Error('Menu image extraction result failed validation.')
  }

  const result = validation.data
  if (!result.isReadable) {
    console.log(
      `[extractMenuFlow] Page ${payload.pageNumber ?? '?'} unreadable for vendor ${payload.vendorId}: ${result.readabilityIssue ?? 'unknown'}`,
    )
    return { ...result, extractedItems: [] }
  }

  console.log(
    `[extractMenuFlow] Extracted ${result.extractedItems.length} items from image page ${payload.pageNumber ?? '?'} for vendor ${payload.vendorId}`,
  )
  return result
}

function parseDataUri(dataUri: string): { mimeType: string; base64: string } {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) throw new Error('Invalid data URI: missing base64 payload.')
  return { mimeType: match[1], base64: match[2] }
}

async function extractViaOpenAiText(vendorId: string, menuText: string): Promise<string> {
  if (!openaiClient) {
    throw new Error('OPENAI_API_KEY is not configured. Unable to run menu extraction.')
  }

  const truncatedMenuText =
    menuText.length > MAX_MENU_TEXT_CHARS
      ? `${menuText.slice(0, MAX_MENU_TEXT_CHARS)}\n\n[Truncated due to size]`
      : menuText

  const response = await openaiClient.responses.create({
    model: openAiMenuModel,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: SYSTEM_PROMPT }] },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `Vendor ID: ${vendorId}.
Here is the text extracted from their menu PDF:

${truncatedMenuText}

Return only JSON following the specified schema.`,
          },
        ],
      },
    ],
  })

  const outputText = response.output_text?.trim()
  if (!outputText) throw new Error('OpenAI did not return any content for menu extraction.')
  return outputText
}

async function extractViaOpenAiPdf(
  vendorId: string,
  menuDataUri: string,
  fileName: string,
): Promise<string> {
  if (!openaiClient) {
    throw new Error('OPENAI_API_KEY is not configured. Unable to run OpenAI PDF extraction.')
  }

  const response = await openaiClient.responses.create({
    model: openAiMenuVisionModel,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: SYSTEM_PROMPT }] },
      {
        role: 'user',
        content: [
          {
            type: 'input_file',
            filename: fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`,
            file_data: menuDataUri,
          },
          {
            type: 'input_text',
            text: `Vendor ID: ${vendorId}.
The attached PDF is a restaurant menu. Extract every orderable item and return ONLY JSON following the schema (no markdown).`,
          },
        ],
      },
    ],
  })

  const outputText = response.output_text?.trim()
  if (!outputText) throw new Error('OpenAI did not return any content for PDF menu extraction.')
  return outputText
}

function parseModelJson(outputText: string): unknown {
  const trimmed = outputText.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  const jsonText = fenced ? fenced[1].trim() : trimmed
  return JSON.parse(jsonText)
}

async function extractViaGeminiPdf(vendorId: string, menuDataUri: string): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY is not configured. Unable to run PDF vision extraction.')
  }

  const { mimeType } = parseDataUri(menuDataUri)
  if (!menuDataUri.startsWith('data:')) {
    throw new Error('Invalid menuDataUri: expected a data URI.')
  }

  const result = await ai.generate({
    model: menuExtractionModel,
    prompt: [
      {
        media: {
          contentType: mimeType,
          url: menuDataUri,
        },
      },
      { text: SYSTEM_PROMPT },
      {
        text: `Vendor ID: ${vendorId}.
The attached PDF is a restaurant menu. Extract every orderable item and return ONLY JSON following the schema (no markdown, no commentary).`,
      },
      {
        text: `JSON schema (for reference, respond with JSON only):\n${JSON.stringify(RESPONSE_JSON_SCHEMA)}`,
      },
    ],
  })

  const text = (result as any)?.text?.trim?.() || (result as any)?.output?.[0]?.content?.[0]?.text?.trim?.()
  if (!text) throw new Error('Gemini did not return any text for menu extraction.')
  return text
}

async function extractViaGeminiImage(
  vendorId: string,
  menuImageDataUri: string,
  pageNumber?: number,
): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY is not configured. Unable to run image vision extraction.')
  }

  const { mimeType } = parseDataUri(menuImageDataUri)
  const pageLabel = pageNumber ? `Page ${pageNumber}` : 'This page'

  const result = await ai.generate({
    model: menuExtractionModel,
    prompt: [
      {
        media: {
          contentType: mimeType,
          url: menuImageDataUri,
        },
      },
      { text: IMAGE_READABILITY_PROMPT },
      {
        text: `Vendor ID: ${vendorId}. ${pageLabel} of a photographed menu.
Assess readability first, then extract items only if readable. Return ONLY JSON.`,
      },
      {
        text: `JSON schema (respond with JSON only):\n${JSON.stringify(IMAGE_PAGE_RESPONSE_JSON_SCHEMA)}`,
      },
    ],
  })

  const text = (result as any)?.text?.trim?.() || (result as any)?.output?.[0]?.content?.[0]?.text?.trim?.()
  if (!text) throw new Error('Gemini did not return any text for menu image extraction.')
  return text
}
 