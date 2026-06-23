import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const fy = req.nextUrl.searchParams.get('fy') ?? '2024-25';
  const [startYear] = fy.split('-');
  const fyStart = `${startYear}-04-01`;
  const fyEnd   = `${parseInt(startYear) + 1}-03-31`;

  const supabase = createClient();

  const { data: runs } = await supabase
    .from('payroll_runs')
    .select('id, month')
    .eq('org_id', ctx.org.id)
    .gte('month', fyStart)
    .lte('month', fyEnd)
    .eq('status', 'processed');

  const runIds = (runs ?? []).map((r) => r.id);

  if (!runIds.length) {
    return new NextResponse('No processed payroll runs found for this financial year', { status: 404 });
  }

  const { data: entries } = await supabase
    .from('payroll_entries')
    .select('employee_id, gross_salary, tds, employee:employees(name, designation)')
    .in('run_id', runIds)
    .eq('org_id', ctx.org.id);

  // Aggregate by employee
  const empMap = new Map<string, { name: string; designation: string; totalGross: number; totalTDS: number }>();
  for (const e of entries ?? []) {
    const emp = e.employee as any;
    if (!empMap.has(e.employee_id)) {
      empMap.set(e.employee_id, { name: emp?.name ?? '—', designation: emp?.designation ?? '', totalGross: 0, totalTDS: 0 });
    }
    const rec = empMap.get(e.employee_id)!;
    rec.totalGross += Number(e.gross_salary);
    rec.totalTDS   += Number(e.tds);
  }

  const rows = ['Employee Name,Designation,Gross Salary (₹),TDS Deducted (₹),FY'];
  for (const v of empMap.values()) {
    rows.push(`"${v.name}","${v.designation}",${v.totalGross.toFixed(2)},${v.totalTDS.toFixed(2)},${fy}`);
  }

  return new NextResponse(rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="Form16_${fy}.csv"`,
    },
  });
}
