import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/apiKeyAuth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
  const supabase = createAdminClient();
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') ?? '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100);
  const { data, count } = await supabase.from('invoices').select('*', { count: 'exact' })
    .eq('org_id', auth.orgId).order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit });
}
