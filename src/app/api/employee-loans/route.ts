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
    .from('employee_loans')
    .select('*, employee:employees(name, department), repayments:loan_repayments(*)')
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
  const { employee_id, amount, emi_amount, disbursed_date, notes } = body;

  if (!employee_id || !amount || !emi_amount) {
    return NextResponse.json({ error: 'Employee, amount and EMI required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('employee_loans')
    .insert({
      org_id: ctx.org.id,
      employee_id,
      amount: Number(amount),
      emi_amount: Number(emi_amount),
      balance: Number(amount),
      disbursed_date: disbursed_date || new Date().toISOString().split('T')[0],
      notes: notes || null,
      created_by: ctx.user.id,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
