import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import { computeDeductions } from '@/lib/types/payroll_compliance';
import type { StatutorySettings } from '@/lib/types/payroll_compliance';

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('hr')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { month, working_days } = await req.json();
  if (!month) return NextResponse.json({ error: 'Month is required' }, { status: 400 });

  const supabase = await createClient();
  const wDays = parseInt(working_days) || 26;

  // Fetch active employees (with basic_pct)
  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select('id, name, monthly_salary, basic_pct')
    .eq('org_id', ctx.org.id)
    .eq('status', 'active');

  if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500 });
  if (!employees?.length) return NextResponse.json({ error: 'No active employees found' }, { status: 400 });

  // Fetch statutory settings (defaults if none set)
  const { data: statRaw } = await supabase
    .from('statutory_settings')
    .select('*')
    .eq('org_id', ctx.org.id)
    .maybeSingle();

  const settings: StatutorySettings = statRaw ?? {
    org_id: ctx.org.id,
    pf_enabled: true,
    esi_enabled: true,
    pt_enabled: false,
    pt_state: 'MH',
    tds_enabled: false,
  };

  // Attendance for the month
  const monthStart = month + '-01';
  const monthEnd = new Date(new Date(monthStart).getFullYear(), new Date(monthStart).getMonth() + 1, 0)
    .toISOString().split('T')[0];

  const { data: attData } = await supabase
    .from('attendance')
    .select('employee_id, status')
    .eq('org_id', ctx.org.id)
    .gte('date', monthStart)
    .lte('date', monthEnd);

  const attMap = new Map<string, number>();
  (attData ?? []).forEach((a) => {
    const val = a.status === 'present' ? 1 : a.status === 'half-day' ? 0.5 : 0;
    attMap.set(a.employee_id, (attMap.get(a.employee_id) ?? 0) + val);
  });

  // Create payroll run
  const { data: run, error: runErr } = await supabase
    .from('payroll_runs')
    .insert({
      org_id: ctx.org.id,
      month: monthStart,
      working_days: wDays,
      status: 'draft',
      created_by: ctx.user.id,
    })
    .select('id')
    .single();

  if (runErr) return NextResponse.json({ error: runErr.message }, { status: 500 });

  // Build entries with statutory deductions
  const entries = employees.map((emp) => {
    const presentDays = Math.min(attMap.get(emp.id) ?? wDays, wDays);
    const gross  = Math.round(((emp.monthly_salary * presentDays) / wDays) * 100) / 100;
    const basicPct = emp.basic_pct ?? 50;
    const d = computeDeductions(gross, basicPct, settings, month);

    return {
      org_id: ctx.org!.id,
      run_id: run.id,
      employee_id: emp.id,
      present_days: Math.round(presentDays),
      gross_salary: gross,
      basic_salary: d.basic,
      pf_employee: d.pfEmployee,
      pf_employer: d.pfEmployer,
      esi_employee: d.esiEmployee,
      esi_employer: d.esiEmployer,
      professional_tax: d.professionalTax,
      tds: d.tds,
      deductions: d.totalEmployeeDeductions,
      net_salary: d.netSalary,
    };
  });

  const { error: entryErr } = await supabase.from('payroll_entries').insert(entries);
  if (entryErr) return NextResponse.json({ error: entryErr.message }, { status: 500 });

  const totalGross = entries.reduce((s, e) => s + e.gross_salary, 0);
  const totalNet   = entries.reduce((s, e) => s + e.net_salary,   0);
  await supabase
    .from('payroll_runs')
    .update({ total_gross: totalGross, total_net: totalNet })
    .eq('id', run.id);

  return NextResponse.json({ id: run.id });
}
