import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();

  // Only the comment author or admin/owner can delete
  const { data: comment } = await supabase
    .from('comments')
    .select('created_by')
    .eq('id', params.id)
    .eq('org_id', ctx.org.id)
    .maybeSingle();

  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const canDelete =
    comment.created_by === ctx.user.id ||
    ['owner', 'admin'].includes(ctx.org.role);

  if (!canDelete) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', params.id)
    .eq('org_id', ctx.org.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
