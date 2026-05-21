import { z } from 'zod'

import { openaiClient, openAiMenuModel } from '@/ai/openai-client'
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

const MAX_MENU_TEXT_CHARS = 120_000

export async function extractMenuData(input: ExtractMenuInput): Promise<ExtractMenuOutput> {
  const payload = ExtractMenuInputSchema.parse(input)

  const outputText = payload.menuText
    ? await extractViaOpenAiText(payload.vendorId, payload.menuText)
    : await extractViaGeminiPdf(payload.vendorId, payload.menuDataUri!)

  let parsed: unknown
  try {
    parsed = JSON.parse(outputText)
  } catch (error) {
    console.error('[extractMenuData] Failed parsing OpenAI output:', outputText)
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

async function extractViaGeminiPdf(vendorId: string, menuDataUri: string): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY is not configured. Unable to run PDF vision extraction.')
  }

  // Genkit googleAI expects inlineData for PDF.
  const base64 = menuDataUri.split(',')[1] || ''
  if (!base64) throw new Error('Invalid menuDataUri: missing base64 payload.')

  const result = await ai.generate({
    model: menuExtractionModel,
    prompt: [
      { text: SYSTEM_PROMPT },
      {
        text: `Vendor ID: ${vendorId}.
The attached PDF is a restaurant menu. Extract every orderable item and return ONLY JSON following the schema (no markdown, no commentary).`,
      },
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: base64,
        },
      } as any,
      {
        text: `JSON schema (for reference, respond with JSON only):\n${JSON.stringify(RESPONSE_JSON_SCHEMA)}`,
      },
    ] as any,
  })

  const text = (result as any)?.text?.trim?.() || (result as any)?.output?.[0]?.content?.[0]?.text?.trim?.()
  if (!text) throw new Error('Gemini did not return any text for menu extraction.')
  return text
}
 