/** Shared prescription / medicine order types (consumer + vendor JSON in placed_orders). */

export const PRESCRIPTION_MAX_AGE_MONTHS = 3;

export interface ParsedMedicineLine {
  id: string;
  name: string;
  /** e.g. 500 mg, 10 mg */
  strength?: string;
  /** e.g. 15 tablets strip, 60 ml bottle */
  packSize?: string;
  /** @deprecated use strength + packSize */
  dosage?: string;
  quantity: number;
  /** Vendor fills after review */
  available?: boolean;
  alternativeName?: string;
  pricePerItem?: number;
  totalPrice?: number;
  vendorNote?: string;
}

export interface PrescriptionMetadata {
  /** Base64 data URI or storage URL */
  imageDataUri?: string;
  prescriptionDate?: string;
  /** Within PRESCRIPTION_MAX_AGE_MONTHS of today */
  dateValid?: boolean;
  doctorName?: string;
  aiRawNotes?: string;
  /** AI could not parse — pharmacy reviews the uploaded image */
  requiresManualReview?: boolean;
  medicines: ParsedMedicineLine[];
}

export function generateMedicineLineId(): string {
  return `med_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function isPrescriptionDateValid(
  prescriptionDate: string | undefined,
  maxAgeMonths = PRESCRIPTION_MAX_AGE_MONTHS
): boolean {
  if (!prescriptionDate?.trim()) return false;
  const parsed = new Date(prescriptionDate);
  if (Number.isNaN(parsed.getTime())) return false;
  const now = new Date();
  if (parsed.getTime() > now.getTime()) return false;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - maxAgeMonths);
  return parsed.getTime() >= cutoff.getTime();
}

export function buildOrderId(): string {
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `ORD-${Date.now()}-${suffix}`;
}

export function isMedicineVendorType(vendorType?: string | null): boolean {
  const v = (vendorType ?? '').toLowerCase();
  return v === 'medical' || v === 'pharmacy' || v === 'medicine';
}

export function formatMedicineLineDetails(
  line: Pick<ParsedMedicineLine, 'strength' | 'packSize' | 'dosage'>
): string {
  const parts = [line.strength, line.packSize].filter(Boolean);
  if (parts.length > 0) return parts.join(' · ');
  if (line.dosage?.trim()) return line.dosage.trim();
  return 'Awaiting pharmacy pricing';
}
