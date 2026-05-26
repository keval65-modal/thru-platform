import { NextRequest, NextResponse } from 'next/server';
import { isValidIfscFormat, lookupIfsc } from '@/lib/ifsc';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const ifsc = (code ?? '').trim().toUpperCase();

  if (!isValidIfscFormat(ifsc)) {
    return NextResponse.json(
      { error: 'Invalid IFSC format. Expected 11 characters (e.g. SBIN0001234).' },
      { status: 400 }
    );
  }

  const result = await lookupIfsc(ifsc);
  if (!result) {
    return NextResponse.json({ error: 'IFSC code not found.' }, { status: 404 });
  }

  return NextResponse.json(result);
}
