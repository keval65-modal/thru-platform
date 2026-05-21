
import { genkit } from 'genkit';
import { googleAI, gemini } from '@genkit-ai/googleai';

const googleAiApiKey = process.env.GOOGLE_AI_API_KEY;
const defaultGeminiModel = process.env.MENU_EXTRACTION_MODEL ?? 'gemini-1.5-flash-001';

if (!googleAiApiKey) {
  console.warn('[Genkit] GOOGLE_AI_API_KEY is not configured. AI features will fail.');
}

console.log('[Genkit] Default Gemini model:', defaultGeminiModel);

export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1beta',
      apiKey: googleAiApiKey,
    }),
  ],
});

export const menuExtractionModel = gemini(defaultGeminiModel);
