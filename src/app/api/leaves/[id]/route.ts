import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('hr')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { status } = body;

  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: leave, error: fetchErr } = await supabase
    .from('leave_requests')
    .select('*, employee_id, start_date, end_date')
    .eq('id', params.id)
    .eq('org_id', ctx.org.id)
    .single();

  if (fetchErr || !leave) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error } = await supabase
    .from('leave_requests')
    .update({
      status,
      approved_by: status === 'approved' ? ctx.user.id : null,
      approved_at: status === 'approved' ? new Date().toISOString() : null,
    })
    .eq('id', params.id)
    .eq('org_id', ctx.org.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If approved, upsert attendance records as 'leave' for each working day
  if (status === 'approved') {
    const start = new Date(leave.start_date);
    const end = new Date(leave.end_date);
    const records: Array<{ org_id: string; employee_id: string; date: string; status: string; created_by: string }> = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) { // skip weekends
        records.push({
          org_id: ctx.org.id,
          employee_id: leave.employee_id,
          date: d.toISOString().split('T')[0],
          status: 'leave',
          created_by: ctx.user.id,
        });
      }
    }
    if (records.length > 0) {
      await supabase.from('attendance').upsert(records, { onConflict: 'employee_id,date' });
    }
  }

  return NextResponse.json({ ok: true });
}
