import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

const ALLOWED_TABLES = ['contacts', 'products', 'deals', 'employees'] as const;
type Table = (typeof ALLOWED_TABLES)[number];

export async function PATCH(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { table, id, archive } = await req.json() as { table: Table; id: string; archive: boolean };
  if (!ALLOWED_TABLES.includes(table)) {
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
  }

  const supabase = createClient();
  const { error } = await supabase
    .from(table)
    .update({ archived_at: archive ? new Date().toISOString() : null })
    .eq('id', id)
    .eq('org_id', ctx.org.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
