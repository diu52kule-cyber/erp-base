import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import crypto from 'crypto';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = await createClient();
  const { data } = await supabase.from('api_keys').select('id,name,key_prefix,active,created_at')
    .eq('org_id', ctx.org.id).order('created_at', { ascending: false });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const rawKey = 'erpk_' + crypto.randomBytes(24).toString('hex');
  const prefix = rawKey.slice(0, 12);
  const hash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const supabase = await createClient();
  const { data, error } = await supabase.from('api_keys')
    .insert({ org_id: ctx.org.id, name, key_prefix: prefix, key_hash: hash, active: true })
    .select('id,name,key_prefix,active,created_at').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ...data, key: rawKey });
}

export async function DELETE(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  const supabase = await createClient();
  await supabase.from('api_keys').update({ active: false }).eq('id', id).eq('org_id', ctx.org.id);
  return NextResponse.json({ success: true });
}
