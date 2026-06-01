/** Shared prescription / medicine order types (consumer + vendor JSON in placed_orders). */

export const PRESCRIPTION_MAX_AGE_MONTHS = 3;

export interface ParsedMedicineLine {
  id: string;
  name: string;
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
