import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

const BUCKET = 'attachments';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const { data: att } = await supabase
    .from('attachments')
    .select('storage_path')
    .eq('id', params.id)
    .eq('org_id', ctx.org.id)
    .single();

  if (!att) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await supabase.storage.from(BUCKET).remove([att.storage_path]);
  await supabase.from('attachments').delete().eq('id', params.id).eq('org_id', ctx.org.id);

  return NextResponse.json({ success: true });
}
