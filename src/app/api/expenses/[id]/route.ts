import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const supabase = createClient();
  const updates: Record<string, unknown> = { status: body.status };
  if (['approved', 'rejected'].includes(body.status)) {
    updates.reviewed_by  = ctx.user.id;
    updates.reviewed_at  = new Date().toISOString();
    if (body.notes) updates.notes = body.notes;
  }
  const { error } = await supabase.from('expense_claims').update(updates).eq('id', params.id).eq('org_id', ctx.org.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
