import { NextRequest, NextResponse } from 'next/server';

import { searchMedicineOptionsFromGoogle } from '@/lib/medicine-quantity-search';

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name')?.trim();

  if (!name) {
    return NextResponse.json({ error: 'name query parameter is required' }, { status: 400 });
  }

  try {
    const { strengths, packSizes } = await searchMedicineOptionsFromGoogle(name);
    return NextResponse.json({
      medicineName: name,
      strengths,
      packSizes,
      /** @deprecated use packSizes */
      suggestions: packSizes,
      source: 'google_search',
    });
  } catch (error) {
    console.error('[medicine/quantity-suggestions]', error);
    return NextResponse.json({ error: 'Failed to fetch quantity suggestions' }, { status: 500 });
  }
}
