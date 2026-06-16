import { NextRequest, NextResponse } from 'next/server';
import {
  analyzePrescriptionImage,
  mockAnalyzePrescription,
} from '@/ai/flows/analyze-prescription-flow';
import { isGoogleAiConfigured } from '@/lib/google-ai-config';
import { prescriptionValidationMessage, prescriptionManualReviewMessage } from '@/lib/prescription-validation';

export const maxDuration = 60;

function manualReviewResponse() {
  return NextResponse.json({
    success: false,
    manualReviewRequired: true,
    message: prescriptionManualReviewMessage(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { imageDataUri?: string; useMock?: boolean };
    const { imageDataUri, useMock } = body;

    if (useMock === true) {
      const mock = mockAnalyzePrescription();
      return NextResponse.json({
        success: true,
        mock: true,
        prescriptionDate: mock.prescriptionDate,
        doctorName: mock.doctorName,
        dateValid: mock.dateValid,
        validationMessage: prescriptionValidationMessage(mock.dateValid),
        medicines: mock.medicinesWithIds,
        notes: mock.notes,
      });
    }

    if (!isGoogleAiConfigured()) {
      return manualReviewResponse();
    }

    if (!imageDataUri?.startsWith('data:image/')) {
      return NextResponse.json({ error: 'imageDataUri (data:image/...) is required' }, { status: 400 });
    }

    const result = await analyzePrescriptionImage({ imageDataUri });

    if (!result.medicinesWithIds.length) {
      return manualReviewResponse();
    }

    return NextResponse.json({
      success: true,
      mock: false,
      prescriptionDate: result.prescriptionDate,
      doctorName: result.doctorName,
      dateValid: result.dateValid,
      validationMessage: prescriptionValidationMessage(result.dateValid),
      medicines: result.medicinesWithIds,
      notes: result.notes,
    });
  } catch (error) {
    console.error('[analyze-prescription]', error);
    return manualReviewResponse();
  }
}
