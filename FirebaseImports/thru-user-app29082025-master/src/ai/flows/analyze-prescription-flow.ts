import { z } from 'zod';
import { ai, prescriptionAnalysisModel } from '@/ai/genkit';
import { getGoogleAiApiKey } from '@/lib/google-ai-config';
import { generateMedicineLineId, isPrescriptionDateValid } from '@/lib/prescription-types';

const AnalyzePrescriptionInputSchema = z.object({
  imageDataUri: z
    .string()
    .refine((v) => v.startsWith('data:image/'), 'Expected a base64 image data URI'),
});

const AnalyzePrescriptionOutputSchema = z.object({
  prescriptionDate: z.string().optional().describe('ISO date YYYY-MM-DD if readable'),
  doctorName: z.string().optional(),
  medicines: z.array(
    z.object({
      name: z.string(),
      dosage: z.string().optional(),
      suggestedQuantity: z.number().optional(),
    })
  ),
  notes: z.string().optional(),
});

export type AnalyzePrescriptionInput = z.infer<typeof AnalyzePrescriptionInputSchema>;
export type AnalyzePrescriptionOutput = z.infer<typeof AnalyzePrescriptionOutputSchema>;

const PROMPT = `You are a pharmacy assistant reading an Indian medical prescription image.
Extract:
1. prescriptionDate — date the prescription was written (YYYY-MM-DD). If unclear, omit.
2. doctorName — prescribing doctor if visible.
3. medicines — each prescribed drug with generic/brand name, dosage/strength if shown, and suggested quantity (default 1 if not specified).
4. notes — brief note if handwriting is illegible for any line.

Respond ONLY with valid JSON matching this schema:
{
  "prescriptionDate": "YYYY-MM-DD or omit",
  "doctorName": "string or omit",
  "medicines": [{ "name": "...", "dosage": "...", "suggestedQuantity": 1 }],
  "notes": "optional"
}`;

export async function analyzePrescriptionImage(
  input: AnalyzePrescriptionInput
): Promise<
  AnalyzePrescriptionOutput & {
    dateValid: boolean;
    medicinesWithIds: { id: string; name: string; dosage?: string; quantity: number }[];
  }
> {
  if (!getGoogleAiApiKey()) {
    throw new Error(
      'Google AI API key is not configured. Set GOOGLE_AI_API_KEY or GENKIT_GOOGLE_AI_API_KEY.'
    );
  }

  const payload = AnalyzePrescriptionInputSchema.parse(input);

  const response = await ai.generate({
    model: prescriptionAnalysisModel,
    prompt: [
      { text: PROMPT },
      { media: { url: payload.imageDataUri } },
    ],
    output: { format: 'json' },
  });

  const text = response.text?.trim() ?? '{}';
  let parsed: AnalyzePrescriptionOutput;
  try {
    parsed = AnalyzePrescriptionOutputSchema.parse(JSON.parse(text));
  } catch {
    parsed = { medicines: [], notes: 'Could not parse prescription automatically.' };
  }

  const dateValid = isPrescriptionDateValid(parsed.prescriptionDate);
  const medicinesWithIds = (parsed.medicines ?? []).map((m) => ({
    id: generateMedicineLineId(),
    name: m.name.trim(),
    dosage: m.dosage?.trim(),
    quantity: Math.max(1, m.suggestedQuantity ?? 1),
  }));

  return {
    ...parsed,
    dateValid,
    medicinesWithIds,
  };
}

/** Demo / offline fallback when Gemini key is missing */
export function mockAnalyzePrescription(): AnalyzePrescriptionOutput & {
  dateValid: boolean;
  medicinesWithIds: { id: string; name: string; dosage?: string; quantity: number }[];
} {
  const prescriptionDate = new Date().toISOString().slice(0, 10);
  return {
    prescriptionDate,
    doctorName: 'Dr. Demo',
    medicines: [{ name: 'Paracetamol 500mg', dosage: '1 strip', suggestedQuantity: 1 }],
    notes: 'Demo parse — pass useMock: true or configure GOOGLE_AI_API_KEY for live vision.',
    dateValid: true,
    medicinesWithIds: [
      { id: generateMedicineLineId(), name: 'Paracetamol 500mg', dosage: '1 strip', quantity: 1 },
      { id: generateMedicineLineId(), name: 'Cetirizine 10mg', dosage: '1 strip', quantity: 1 },
    ],
  };
}
