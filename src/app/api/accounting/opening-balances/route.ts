import { NextRequest, NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('accounting') || !ctx.org) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const fy = new URL(req.url).searchParams.get('fy') ?? String(new Date().getFullYear());
  const supabase = createClient();
  try {
    const { data } = await supabase
      .from('account_opening_balances')
      .select('*, account:chart_of_accounts(name, type, code)')
      .eq('org_id', ctx.org.id)
      .eq('fy', fy);
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([]);
  }
}

export async function PUT(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('accounting') || !ctx.org) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const { account_id, fy, amount } = body;
  if (!account_id || !fy) return NextResponse.json({ error: 'account_id and fy required' }, { status: 400 });

  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('account_opening_balances')
      .upsert(
        { org_id: ctx.org.id, account_id, fy, amount: amount ?? 0, updated_at: new Date().toISOString() },
        { onConflict: 'org_id,account_id,fy' }
      )
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
