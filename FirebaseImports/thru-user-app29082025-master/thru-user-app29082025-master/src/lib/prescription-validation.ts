import { isPrescriptionDateValid, PRESCRIPTION_MAX_AGE_MONTHS } from './prescription-types';

export function prescriptionValidationMessage(valid: boolean): string {
  if (valid) {
    return `Prescription date is within the last ${PRESCRIPTION_MAX_AGE_MONTHS} months.`;
  }
  return `Prescription must be dated within the last ${PRESCRIPTION_MAX_AGE_MONTHS} months to order medicine.`;
}

export function prescriptionManualReviewMessage(): string {
  return 'We could not read your prescription automatically. Your prescription image will still be sent to the pharmacy on your route, and they will update the order based on your prescription.';
}

export { isPrescriptionDateValid, PRESCRIPTION_MAX_AGE_MONTHS };
