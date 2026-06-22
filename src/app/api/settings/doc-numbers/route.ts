import { NextRequest, NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('org_doc_settings')
      .select('*')
      .eq('org_id', ctx.org.id);
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([]);
  }
}

export async function PUT(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = ctx.org.role as string;
  if (!['owner', 'admin'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { doc_type, prefix, start_number, fy_reset } = body;
  if (!doc_type) return NextResponse.json({ error: 'doc_type required' }, { status: 400 });

  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('org_doc_settings')
      .upsert(
        { org_id: ctx.org.id, doc_type, prefix: prefix ?? '', start_number: start_number ?? 1, fy_reset: fy_reset ?? true, updated_at: new Date().toISOString() },
        { onConflict: 'org_id,doc_type' }
      )
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
