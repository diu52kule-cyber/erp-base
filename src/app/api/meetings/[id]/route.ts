import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

// Update meeting notes/agenda
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const update: Record<string, unknown> = {};
  for (const k of ['title', 'agenda', 'notes', 'meeting_date']) if (body[k] !== undefined) update[k] = body[k] || null;
  const supabase = createClient();
  const { error } = await supabase.from('meetings').update(update).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
