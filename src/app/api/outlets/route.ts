import { NextRequest, NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createClient();
  try {
    const { data } = await supabase
      .from('outlets')
      .select('*')
      .eq('org_id', ctx.org.id)
      .order('name');
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['owner', 'admin'].includes(ctx.org.role ?? '')) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  const { name, address, phone, code, status } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('outlets')
      .insert({ org_id: ctx.org.id, name: name.trim(), address, phone, code, status: status ?? 'active' })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
