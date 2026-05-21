import { z } from 'zod'

import { openaiClient, openAiMenuModel } from '@/ai/openai-client'

const MenuItemSchema = z.object({
  category: z
    .string()
    .describe('The category of the menu item (e.g., Appetizers, Main Courses, Desserts).'),
  itemName: z.string().describe('The name of the menu item.'),
  price: z.string().describe('The price of the menu item (as a string, e.g., "$10.99", "£8.50").'),
  description: z.string().optional().describe('A brief description of the menu item, if available.'),
})

const ExtractMenuInputSchema = z.object({
  menuFileId: z.string().describe('OpenAI file ID for the uploaded menu PDF.'),
  vendorId: z.string().describe('The ID of the vendor uploading the menu.'),
})
export type ExtractMenuInput = z.infer<typeof ExtractMenuInputSchema>

const ExtractMenuOutputSchema = z.object({
  extractedItems: z.array(MenuItemSchema).describe('An array of extracted menu items.'),
  rawText: z.string().optional().describe('Raw text extracted if structured parsing fails or as supplementary info.'),
})
export type ExtractMenuOutput = z.infer<typeof ExtractMenuOutputSchema>

const SYSTEM_PROMPT = `You are an expert menu parsing assistant. Given a restaurant menu PDF you must:
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

export async function extractMenuData(input: ExtractMenuInput): Promise<ExtractMenuOutput> {
  const payload = ExtractMenuInputSchema.parse(input)

  if (!openaiClient) {
    throw new Error('OPENAI_API_KEY is not configured. Unable to run menu extraction.')
  }

  const response = await openaiClient.responses.create({
    model: openAiMenuModel,
    input: [
      {
        role: 'system',
        content: [{ type: 'input_text', text: SYSTEM_PROMPT }],
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `Vendor ID: ${payload.vendorId}. Parse the attached menu PDF and return structured JSON only.`,
          },
          {
            type: 'input_file',
            file_id: payload.menuFileId,
          },
        ],
      },
    ],
  })

  const outputText = response.output_text?.trim()
  if (!outputText) {
    throw new Error('OpenAI did not return any content for menu extraction.')
  }

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
/**
 * @fileOverview Menu extraction flow powered by OpenAI Responses API.
 */

import { z } from 'zod';

import { openaiClient, openAiMenuModel } from '@/ai/openai-client';

const MenuItemSchema = z.object({
  category: z
    .string()
    .describe('The category of the menu item (e.g., Appetizers, Main Courses, Desserts).'),
  itemName: z.string().describe('The name of the menu item.'),
  price: z.string().describe('The price of the menu item (as a string, e.g., "$10.99", "£8.50").'),
  description: z.string().optional().describe('A brief description of the menu item, if available.'),
});

const ExtractMenuInputSchema = z.object({
  menuFileId: z.string().describe('OpenAI file ID for the uploaded menu PDF.'),
  vendorId: z.string().describe('The ID of the vendor uploading the menu.'),
});
export type ExtractMenuInput = z.infer<typeof ExtractMenuInputSchema>;

const ExtractMenuOutputSchema = z.object({
  extractedItems: z.array(MenuItemSchema).describe('An array of extracted menu items.'),
  rawText: z.string().optional().describe('Raw text extracted if structured parsing fails or as supplementary info.'),
});
export type ExtractMenuOutput = z.infer<typeof ExtractMenuOutputSchema>;

const SYSTEM_PROMPT = `You are an expert menu parsing assistant. Given a restaurant menu PDF you must:
1. List every food or beverage item that a customer can order.
2. Preserve or infer sensible categories (Appetizers, Mains, Desserts, Drinks, etc.).
3. Capture the item name, the price text exactly as printed (currency symbols included), and any description if available.
4. Only respond with JSON matching the requested schema. No narrative text.`;

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
};

export async function extractMenuData(input: ExtractMenuInput): Promise<ExtractMenuOutput> {
  const payload = ExtractMenuInputSchema.parse(input);

  if (!openaiClient) {
    throw new Error('OPENAI_API_KEY is not configured. Unable to run menu extraction.');
  }

  const response = await openaiClient.responses.create({
    model: openAiMenuModel,
    input: [
      {
        role: 'system',
        content: [{ type: 'input_text', text: SYSTEM_PROMPT }],
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `Vendor ID: ${payload.vendorId}. Parse the attached menu PDF and return structured JSON only.`,
          },
          {
            type: 'input_file',
            file_id: payload.menuFileId,
          },
        ],
      },
    ],
  });

  const outputText = response.output_text?.trim();
  if (!outputText) {
    throw new Error('OpenAI did not return any content for menu extraction.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText);
  } catch (error) {
    console.error('[extractMenuData] Failed parsing OpenAI output:', outputText);
    throw new Error('Menu extraction model returned invalid JSON.');
  }

  const validation = ExtractMenuOutputSchema.safeParse(parsed);
  if (!validation.success) {
    console.error('[extractMenuData] OpenAI output validation failed:', validation.error.flatten());
    throw new Error('Menu extraction result failed validation.');
  }

  console.log(
    `[extractMenuFlow] Successfully extracted ${validation.data.extractedItems.length} items for vendor: ${payload.vendorId}`,
  );

  return validation.data;
}

