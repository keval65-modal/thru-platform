/** Indian IFSC format: 4 letters + 0 + 6 alphanumeric */
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export function isValidIfscFormat(ifsc: string): boolean {
  return IFSC_REGEX.test(ifsc.trim().toUpperCase());
}

export type IfscLookupResult = {
  ifsc: string;
  bank: string;
  branch: string;
  address: string;
  city: string;
  state: string;
  micr: string | null;
};

type RazorpayIfscResponse = {
  IFSC?: string;
  BANK?: string;
  BRANCH?: string;
  ADDRESS?: string;
  CITY?: string;
  STATE?: string;
  MICR?: string;
};

export async function lookupIfsc(ifsc: string): Promise<IfscLookupResult | null> {
  const code = ifsc.trim().toUpperCase();
  if (!isValidIfscFormat(code)) return null;

  const res = await fetch(`https://ifsc.razorpay.com/${encodeURIComponent(code)}`, {
    headers: { Accept: 'application/json' },
    cache: 'force-cache',
  });

  if (!res.ok) return null;

  let data: RazorpayIfscResponse;
  try {
    data = (await res.json()) as RazorpayIfscResponse;
  } catch {
    return null;
  }
  if (!data.BANK || !data.IFSC) return null;

  return {
    ifsc: data.IFSC,
    bank: data.BANK,
    branch: data.BRANCH ?? '',
    address: data.ADDRESS ?? '',
    city: data.CITY ?? '',
    state: data.STATE ?? '',
    micr: data.MICR ?? null,
  };
}

/** UPI VPA: user@provider */
export const UPI_ID_REGEX = /^[\w.\-]{2,256}@[\w]{2,64}$/i;

export function isValidUpiId(upi: string): boolean {
  return UPI_ID_REGEX.test(upi.trim());
}
