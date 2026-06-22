import { NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('hr') || !ctx.org) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('employees')
    .select('name, designation, department, employment_type, status, monthly_salary, joining_date, email, phone, pan_number, bank_account, bank_ifsc')
    .eq('org_id', ctx.org.id)
    .is('archived_at', null)
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const cols = ['Name', 'Designation', 'Department', 'Employment Type', 'Status', 'Monthly Salary', 'Joining Date', 'Email', 'Phone', 'PAN', 'Bank Account', 'IFSC'];
  const rows = (data ?? []).map((e) => [
    e.name, e.designation ?? '', e.department ?? '', e.employment_type ?? '', e.status ?? '',
    e.monthly_salary ?? '', e.joining_date ?? '', e.email ?? '', e.phone ?? '',
    e.pan_number ?? '', e.bank_account ?? '', e.bank_ifsc ?? '',
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));

  const csv = [cols.join(','), ...rows].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="employees-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}
