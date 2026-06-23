import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, email, phone, department, designation, employment_type, joining_date, monthly_salary, status, avatar_color, manager:manager_id(name)')
    .eq('org_id', ctx.org.id)
    .eq('status', 'active')
    .is('archived_at', null)
    .order('department')
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ employees: data ?? [] });
}
