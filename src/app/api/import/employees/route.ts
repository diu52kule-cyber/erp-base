import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rows } = await req.json() as { rows: Record<string, string>[] };
  if (!rows?.length) return NextResponse.json({ error: 'No rows provided' }, { status: 400 });

  const supabase = createClient();
  const records = rows.map((r) => ({
    org_id: ctx.org!.id,
    name: (r.name || r.Name || '').trim(),
    email: r.email || r.Email || null,
    phone: r.phone || r.Phone || null,
    department: r.department || r.Department || null,
    designation: r.designation || r.Designation || null,
    employment_type: (['full-time','part-time','contract','intern'].includes(r.employment_type || r['Employment Type']) ? (r.employment_type || r['Employment Type']) : 'full-time'),
    joining_date: r.joining_date || r['Joining Date'] || new Date().toISOString().split('T')[0],
    monthly_salary: parseFloat(r.monthly_salary || r['Monthly Salary'] || '0') || 0,
    created_by: ctx.user.id,
  })).filter((r) => r.name);

  if (!records.length) return NextResponse.json({ error: 'No valid rows (name column missing?)' }, { status: 400 });

  const { error } = await supabase.from('employees').insert(records);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ imported: records.length });
}
