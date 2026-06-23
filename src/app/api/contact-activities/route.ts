import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('crm')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const contact_id = req.nextUrl.searchParams.get('contact_id');
  if (!contact_id) return NextResponse.json({ error: 'contact_id required' }, { status: 400 });

  const supabase = createClient();
  const { data } = await supabase
    .from('contact_activities')
    .select('*')
    .eq('org_id', ctx.org.id)
    .eq('contact_id', contact_id)
    .order('created_at', { ascending: false });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('crm')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { contact_id, type, body: actBody, due_date } = body;

  if (!contact_id || !type || !actBody?.trim()) {
    return NextResponse.json({ error: 'contact_id, type and body required' }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('contact_activities')
    .insert({
      org_id: ctx.org.id,
      contact_id,
      type,
      body: actBody.trim(),
      due_date: due_date || null,
      created_by: ctx.user.id,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
