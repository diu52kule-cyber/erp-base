import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  const [{ count: total }, { count: presentToday }, payrollResult] = await Promise.all([
    supabase.from('employees').select('*', { count: 'exact', head: true })
      .eq('org_id', ctx.org.id).eq('status', 'active').is('archived_at', null),
    supabase.from('attendance').select('*', { count: 'exact', head: true })
      .eq('org_id', ctx.org.id).eq('date', today).in('status', ['present', 'half-day']),
    supabase.from('employees').select('monthly_salary')
      .eq('org_id', ctx.org.id).eq('status', 'active').is('archived_at', null),
  ]);

  let pendingLeaves = 0;
  try {
    const { count } = await supabase.from('leave_requests').select('*', { count: 'exact', head: true })
      .eq('org_id', ctx.org.id).eq('status', 'pending');
    pendingLeaves = count ?? 0;
  } catch {}

  const payroll = (payrollResult.data ?? []).reduce((s: number, e: any) => s + Number(e.monthly_salary), 0);

  return NextResponse.json({ total, presentToday, pendingLeaves, payroll });
}
