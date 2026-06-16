import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  listSavedDestinations,
  upsertSavedDestination,
} from '@/lib/supabase/saved-destination-service';

const FirebaseUidSchema = z.object({
  firebaseUid: z.string().min(1),
});

const SaveDestinationSchema = z.object({
  firebaseUid: z.string().min(1),
  phone: z.string().optional().nullable(),
  labelType: z.enum(['home', 'office', 'gym', 'other']),
  customLabel: z.string().optional().nullable(),
  address: z.string().min(2),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  placeId: z.string().optional().nullable(),
}).refine(
  (data) => data.labelType !== 'other' || Boolean(data.customLabel?.trim()),
  { message: 'Custom name is required for Other destinations', path: ['customLabel'] }
);

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const firebaseUid = searchParams.get('firebaseUid');
    const parsed = FirebaseUidSchema.safeParse({ firebaseUid });
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'firebaseUid is required' }, { status: 400 });
    }

    const destinations = await listSavedDestinations(parsed.data.firebaseUid);
    return NextResponse.json({ success: true, destinations });
  } catch (error) {
    console.error('[saved-destinations GET]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load destinations' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = SaveDestinationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const destination = await upsertSavedDestination(parsed.data);
    return NextResponse.json({ success: true, destination });
  } catch (error) {
    console.error('[saved-destinations POST]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save destination' },
      { status: 500 }
    );
  }
}
