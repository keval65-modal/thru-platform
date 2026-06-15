import { NextResponse } from 'next/server';
import { z } from 'zod';
import { deleteSavedDestination } from '@/lib/supabase/saved-destination-service';

const DeleteSchema = z.object({
  firebaseUid: z.string().min(1),
});

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = DeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'firebaseUid is required' }, { status: 400 });
    }

    await deleteSavedDestination(parsed.data.firebaseUid, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[saved-destinations DELETE]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete destination' },
      { status: 500 }
    );
  }
}
