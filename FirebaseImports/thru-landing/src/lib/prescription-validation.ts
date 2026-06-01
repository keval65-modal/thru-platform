import { isPrescriptionDateValid, PRESCRIPTION_MAX_AGE_MONTHS } from './prescription-types';

export function prescriptionValidationMessage(valid: boolean): string {
  if (valid) {
    return `Prescription date is within the last ${PRESCRIPTION_MAX_AGE_MONTHS} months.`;
  }
  return `Prescription must be dated within the last ${PRESCRIPTION_MAX_AGE_MONTHS} months to order medicine.`;
}

export { isPrescriptionDateValid, PRESCRIPTION_MAX_AGE_MONTHS };
