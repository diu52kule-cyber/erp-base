import { NextRequest, NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('hr') || !ctx.org) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url    = new URL(req.url);
  const weekOf = url.searchParams.get('week_of'); // ISO date of any day in the week
  const supabase = createClient();

  let start = '', end = '';
  if (weekOf) {
    const d = new Date(weekOf);
    const day = d.getDay();
    const mon = new Date(d); mon.setDate(d.getDate() - ((day + 6) % 7));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    start = mon.toISOString().split('T')[0];
    end   = sun.toISOString().split('T')[0];
  }

  try {
    let q = supabase
      .from('shifts')
      .select('*, employee:employees(name, designation, department)')
      .eq('org_id', ctx.org.id)
      .order('date')
      .order('start_time');
    if (start && end) q = q.gte('date', start).lte('date', end);
    const { data } = await q;
    return NextResponse.json({ data: data ?? [], weekStart: start, weekEnd: end });
  } catch {
    return NextResponse.json({ data: [], weekStart: start, weekEnd: end });
  }
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('hr') || !ctx.org) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const { employee_id, date, start_time, end_time, notes } = body;
  if (!employee_id || !date || !start_time || !end_time) {
    return NextResponse.json({ error: 'employee_id, date, start_time, end_time required' }, { status: 400 });
  }
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('shifts')
      .upsert(
        { org_id: ctx.org.id, employee_id, date, start_time, end_time, notes: notes ?? null },
        { onConflict: 'org_id,employee_id,date' }
      )
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('hr') || !ctx.org) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const supabase = createClient();
  try {
    await supabase.from('shifts').delete().eq('id', id).eq('org_id', ctx.org.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
