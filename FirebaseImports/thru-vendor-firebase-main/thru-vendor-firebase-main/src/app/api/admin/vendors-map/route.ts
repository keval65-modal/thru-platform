import { NextResponse } from 'next/server';
import { getVendorsForMap } from '@/app/(app)/admin/actions';

export async function GET() {
  try {
    const result = await getVendorsForMap();
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ vendors: result.vendors || [] });
  } catch (error) {
    console.error('[API] Error fetching vendors for map:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
}
