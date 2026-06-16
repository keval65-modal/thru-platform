import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DDL_PATH = join(
  process.cwd(),
  'src',
  'lib',
  'supabase',
  'sql',
  'saved-destinations-schema.sql'
);

async function applySchema() {
  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured on this deployment');
  }

  const ddl = readFileSync(DDL_PATH, 'utf8');
  const sql = postgres(databaseUrl, { max: 1 });
  try {
    await sql.unsafe(ddl);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/** One-time schema bootstrap for saved destinations (requires DATABASE_URL on Vercel). */
export async function POST(request: Request) {
  const secret = request.headers.get('x-setup-secret');
  const expected = process.env.SETUP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!expected || secret !== expected) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await applySchema();
    return NextResponse.json({
      success: true,
      message: 'saved_destinations schema applied',
    });
  } catch (error) {
    console.error('[setup/saved-destinations-schema]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Migration failed',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { createServiceSupabaseClient } = await import('@/lib/supabase/server');
    const supabase = createServiceSupabaseClient();
    const { error } = await supabase.from('saved_destinations').select('id').limit(1);
    if (error) {
      return NextResponse.json({ success: true, exists: false, error: error.message });
    }
    return NextResponse.json({ success: true, exists: true });
  } catch (error) {
    return NextResponse.json({
      success: false,
      exists: false,
      error: error instanceof Error ? error.message : 'Check failed',
    });
  }
}
