import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, content, doc_type, icon, parent_id } = await req.json();
  const supabase = createClient();
  const { data, error } = await supabase.from('docs').insert({
    org_id: ctx.org.id,
    title: title || 'Untitled',
    content: content ?? '',
    doc_type: doc_type || 'doc',
    icon: icon || '📄',
    parent_id: parent_id || null,
    created_by: ctx.user.id,
    updated_by: ctx.user.id,
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
