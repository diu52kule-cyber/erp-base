import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('hr')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = await createClient();
  const employeeId = req.nextUrl.searchParams.get('employee_id');
  let q = supabase
    .from('leave_requests')
    .select('*, employee:employees(name, department), leave_type:leave_types(name, color, paid)')
    .eq('org_id', ctx.org.id)
    .order('created_at', { ascending: false });
  if (employeeId) q = q.eq('employee_id', employeeId);
  const { data } = await q;
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('hr')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { employee_id, leave_type_id, start_date, end_date, days, notes } = body;

  if (!employee_id || !leave_type_id || !start_date || !end_date) {
    return NextResponse.json({ error: 'Employee, leave type, start and end date required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('leave_requests')
    .insert({
      org_id: ctx.org.id,
      employee_id,
      leave_type_id,
      start_date,
      end_date,
      days: days ?? 1,
      notes: notes || null,
      created_by: ctx.user.id,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
