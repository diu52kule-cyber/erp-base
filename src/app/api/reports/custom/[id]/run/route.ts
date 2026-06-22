import { NextRequest, NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

const SOURCE_TABLE: Record<string, string> = {
  invoices:  'invoices',
  contacts:  'contacts',
  products:  'products',
  deals:     'deals',
  employees: 'employees',
  expenses:  'expense_claims',
};

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  try {
    const { data: report } = await supabase
      .from('custom_reports')
      .select('*')
      .eq('id', params.id)
      .eq('org_id', ctx.org.id)
      .single();

    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

    const table = SOURCE_TABLE[report.source];
    if (!table) return NextResponse.json({ error: 'Invalid source' }, { status: 400 });

    // Build select columns
    const cols: string[] = (report.columns as { key: string }[]).map((c) => c.key);
    const selectStr = cols.length > 0 ? cols.join(', ') : '*';

    let query = supabase
      .from(table)
      .select(selectStr)
      .eq('org_id', ctx.org.id);

    // Apply filters
    for (const f of (report.filters as { field: string; op: string; value: string }[] ?? [])) {
      const { field, op, value } = f;
      if (!field || !op || value === undefined) continue;
      if (op === 'eq')     query = query.eq(field, value);
      if (op === 'neq')    query = query.neq(field, value);
      if (op === 'ilike')  query = query.ilike(field, `%${value}%`);
      if (op === 'gt')     query = query.gt(field, value);
      if (op === 'lt')     query = query.lt(field, value);
      if (op === 'gte')    query = query.gte(field, value);
      if (op === 'lte')    query = query.lte(field, value);
    }

    // Sort
    if (report.sort_by) {
      query = query.order(report.sort_by, { ascending: report.sort_dir === 'asc' });
    }

    const { data, error } = await query.limit(500);
    if (error) throw error;

    return NextResponse.json({ data: data ?? [], columns: report.columns });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
