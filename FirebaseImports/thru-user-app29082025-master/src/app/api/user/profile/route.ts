import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserProfile, upsertUserProfile } from '@/lib/supabase/user-profile-service';

const GetProfileSchema = z.object({
  firebaseUid: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
});

const SaveProfileSchema = z.object({
  firebaseUid: z.string().min(1),
  name: z.string().min(2),
  phoneNumber: z.string().min(8),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  gender: z.string().optional(),
  city: z.string().optional(),
  vehicles: z.array(z.object({
    number: z.string().min(1),
    make: z.string().optional(),
    model: z.string().optional(),
  })).optional(),
  vehicleNumbers: z.array(z.string()).optional(),
});

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = GetProfileSchema.safeParse({
      firebaseUid: searchParams.get('firebaseUid'),
      phone: searchParams.get('phone'),
    });

    if (!parsed.success || (!parsed.data.firebaseUid && !parsed.data.phone)) {
      return NextResponse.json(
        { success: false, error: 'firebaseUid or phone is required' },
        { status: 400 }
      );
    }

    let profile = await getUserProfile({
      firebaseUid: parsed.data.firebaseUid ?? undefined,
      phone: parsed.data.phone,
    });
    if (!profile && parsed.data.firebaseUid && parsed.data.phone) {
      profile = await getUserProfile({ phone: parsed.data.phone });
    }

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('[user-profile GET]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load profile' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = SaveProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { firebaseUid, ...profile } = parsed.data;
    const saved = await upsertUserProfile({
      firebaseUid,
      profile: {
        ...profile,
        email: profile.email || undefined,
      },
    });

    return NextResponse.json({ success: true, profile: saved });
  } catch (error) {
    console.error('[user-profile POST]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save profile' },
      { status: 500 }
    );
  }
}
