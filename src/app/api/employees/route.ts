import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('hr')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { name, email, phone, department, designation, employment_type, joining_date, monthly_salary } = body;

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('employees')
    .insert({
      org_id: ctx.org.id,
      name: name.trim(),
      email: email || null,
      phone: phone || null,
      department: department || null,
      designation: designation || null,
      employment_type: employment_type || 'full-time',
      joining_date: joining_date || new Date().toISOString().split('T')[0],
      monthly_salary: parseFloat(monthly_salary) || 0,
      created_by: ctx.user.id,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
