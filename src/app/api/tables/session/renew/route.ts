import { supabaseAdmin } from '@/lib/supabase/admin';
import { type NextRequest, NextResponse } from 'next/server';

// Duration is always 3 hours (in ms)
const SESSION_DURATION_MS = 3 * 60 * 60 * 1000;
// Always force new session
const FORCE_THRESHOLD_MS = 0;

export async function POST(req: NextRequest) {
  try {
    const { restaurant_id } = await req.json();
    if (!restaurant_id) {
      return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 });
    }

    // Get all table ids for the restaurant
    const { data: tables, error: getError } = await supabaseAdmin
      .from('tables')
      .select('id, table_number')
      .eq('restaurant_id', restaurant_id);
    if (getError) {
      return NextResponse.json({ error: getError.message }, { status: 500 });
    }

    const results: Array<{ id: string; table_number: number; session_token: string; session_expires_at: string | null }> = [];
    for (const table of tables) {
      // Call the ensure_table_session Supabase function
      const { data, error } = await supabaseAdmin.rpc('ensure_table_session', {
        p_table_id: table.id,
        p_restaurant_id: restaurant_id,
        p_duration_ms: SESSION_DURATION_MS,
        p_threshold_ms: FORCE_THRESHOLD_MS,
      });
      if (error || !data || !data[0]) {
        continue; // could collect errors if you want
      }
      results.push({
        id: table.id,
        table_number: table.table_number,
        session_token: data[0].session_token,
        session_expires_at: data[0].session_expires_at,
      });
    }
    return NextResponse.json({ tables: results });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
