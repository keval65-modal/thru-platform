import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  listTravelPatterns,
  recordTravelPattern,
} from '@/lib/supabase/saved-destination-service';

const FirebaseUidSchema = z.object({
  firebaseUid: z.string().min(1),
});

const RecordPatternSchema = z.object({
  firebaseUid: z.string().min(1),
  savedDestinationId: z.string().uuid().optional().nullable(),
  destinationLabel: z.string().min(1),
  destinationLat: z.number().min(-90).max(90),
  destinationLng: z.number().min(-180).max(180),
  departureAt: z.string().min(1),
  isImmediate: z.boolean().default(false),
});

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const firebaseUid = searchParams.get('firebaseUid');
    const parsed = FirebaseUidSchema.safeParse({ firebaseUid });
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'firebaseUid is required' }, { status: 400 });
    }

    const patterns = await listTravelPatterns(parsed.data.firebaseUid);
    return NextResponse.json({ success: true, patterns });
  } catch (error) {
    console.error('[travel-patterns GET]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load patterns' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = RecordPatternSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const pattern = await recordTravelPattern(parsed.data);
    return NextResponse.json({ success: true, pattern });
  } catch (error) {
    console.error('[travel-patterns POST]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to record travel pattern' },
      { status: 500 }
    );
  }
}
