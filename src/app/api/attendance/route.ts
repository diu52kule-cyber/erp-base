import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('hr')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  // Accepts either a single record or an array (bulk mark)
  const records: Array<{ employee_id: string; date: string; status: string; notes?: string }> =
    Array.isArray(body) ? body : [body];

  const supabase = await createClient();
  const { error } = await supabase
    .from('attendance')
    .upsert(
      records.map((r) => ({
        org_id: ctx.org!.id,
        employee_id: r.employee_id,
        date: r.date,
        status: r.status,
        notes: r.notes || null,
        created_by: ctx.user.id,
      })),
      { onConflict: 'employee_id,date' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
