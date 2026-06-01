export const PRESCRIPTION_MAX_AGE_MONTHS = 3;

export interface ParsedMedicineLine {
  id: string;
  name: string;
  dosage?: string;
  quantity: number;
  available?: boolean;
  alternativeName?: string;
  pricePerItem?: number;
  totalPrice?: number;
  vendorNote?: string;
}

export interface PrescriptionMetadata {
  imageDataUri?: string;
  prescriptionDate?: string;
  dateValid?: boolean;
  doctorName?: string;
  aiRawNotes?: string;
  medicines?: ParsedMedicineLine[];
}

export function isMedicineOrder(portion: { orderType?: string; vendorType?: string; prescription?: unknown }): boolean {
  if (portion.orderType === 'medicine') return true;
  const v = (portion.vendorType ?? '').toLowerCase();
  return (v === 'medical' || v === 'pharmacy') && Boolean(portion.prescription);
}

export function isMedicineVendorType(vendorType?: string | null): boolean {
  const v = (vendorType ?? '').toLowerCase();
  return v === 'medical' || v === 'pharmacy' || v === 'medicine';
}
