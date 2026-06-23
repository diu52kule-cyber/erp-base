import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('crm')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { title, contact_id, value, stage, expected_close, notes } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Deal title is required' }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('deals')
    .insert({
      org_id: ctx.org.id,
      title: title.trim(),
      contact_id: contact_id || null,
      value: parseFloat(value) || 0,
      stage: stage || 'lead',
      expected_close: expected_close || null,
      notes: notes || null,
      created_by: ctx.user.id,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
