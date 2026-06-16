import { genkit } from 'genkit';
import { googleAI, gemini } from '@genkit-ai/googleai';
import { getGoogleAiApiKey } from '@/lib/google-ai-config';

const googleAiApiKey = getGoogleAiApiKey();
const prescriptionModelName =
  process.env.PRESCRIPTION_ANALYSIS_MODEL ?? 'gemini-2.0-flash';

if (!googleAiApiKey) {
  console.warn(
    '[Genkit] Google AI API key is not configured. Set GOOGLE_AI_API_KEY or GENKIT_GOOGLE_AI_API_KEY.'
  );
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1beta',
      ...(googleAiApiKey ? { apiKey: googleAiApiKey } : {}),
    }),
  ],
});

export const prescriptionAnalysisModel = gemini(prescriptionModelName);
