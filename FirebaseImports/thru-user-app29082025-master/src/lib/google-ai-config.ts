const GOOGLE_AI_ENV_KEYS = [
  'GOOGLE_AI_API_KEY',
  'GENKIT_GOOGLE_AI_API_KEY',
  'GOOGLE_GENAI_API_KEY',
  'GEMINI_API_KEY',
] as const;

/** Resolve the Google/Gemini API key from any supported env var name. */
export function getGoogleAiApiKey(): string | undefined {
  for (const key of GOOGLE_AI_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function isGoogleAiConfigured(): boolean {
  return Boolean(getGoogleAiApiKey());
}
