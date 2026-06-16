import OpenAI from 'openai'

const apiKey = process.env.OPENAI_API_KEY

if (!apiKey) {
  console.warn('[OpenAI] OPENAI_API_KEY is not configured. Menu extraction will fail.')
}

export const openAiMenuModel = process.env.OPENAI_MENU_MODEL ?? 'gpt-4o-mini'
export const openAiMenuVisionModel =
  process.env.OPENAI_MENU_VISION_MODEL ?? process.env.OPENAI_MENU_MODEL ?? 'gpt-4o-mini'

export const openaiClient = apiKey
  ? new OpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL,
    })
  : null

