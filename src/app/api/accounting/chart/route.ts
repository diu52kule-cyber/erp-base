import { NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('accounting') || !ctx.org) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('id, name, type, code, is_active')
      .eq('org_id', ctx.org.id)
      .eq('is_active', true)
      .order('type')
      .order('code');
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([]);
  }
}
