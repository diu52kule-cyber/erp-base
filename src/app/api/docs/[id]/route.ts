import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const { id } = params;
  const body = await req.json();

  // Snapshot the current version before overwriting (only when content changes)
  if (body.snapshot) {
    const { data: current } = await supabase.from('docs').select('title, content').eq('id', id).single();
    if (current) {
      await supabase.from('doc_versions').insert({
        doc_id: id, org_id: ctx.org.id, title: current.title, content: current.content, edited_by: ctx.user.id,
      });
    }
  }

  const update: Record<string, unknown> = { updated_by: ctx.user.id, updated_at: new Date().toISOString() };
  if (body.title !== undefined)  update.title = body.title;
  if (body.content !== undefined) update.content = body.content;
  if (body.status !== undefined)  update.status = body.status;
  if (body.icon !== undefined)    update.icon = body.icon;

  const { error } = await supabase.from('docs').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createClient();
  const { error } = await supabase.from('docs').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
