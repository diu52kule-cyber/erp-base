import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('accounting')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') ?? new Date(new Date().getFullYear(), 3, 1).toISOString().split('T')[0];
  const to   = searchParams.get('to')   ?? new Date().toISOString().split('T')[0];

  const supabase = createClient();
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*, lines:journal_entry_lines(*, account:chart_of_accounts(code,name,type))')
    .eq('org_id', ctx.org.id)
    .gte('entry_date', from)
    .lte('entry_date', to)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ journals: data ?? [] });
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('accounting')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { entry_date, reference, narration, lines } = body as {
    entry_date: string;
    reference?: string;
    narration?: string;
    lines: { account_id: string; debit: number; credit: number; description?: string }[];
  };

  if (!lines || lines.length < 2) {
    return NextResponse.json({ error: 'Journal must have at least 2 lines' }, { status: 400 });
  }

  const totalDebit  = lines.reduce((s, l) => s + (l.debit  ?? 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit ?? 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return NextResponse.json({ error: `Entry is not balanced: Dr ${totalDebit} ≠ Cr ${totalCredit}` }, { status: 400 });
  }

  const supabase = createClient();
  const { data: je, error: jeErr } = await supabase
    .from('journal_entries')
    .insert({ org_id: ctx.org.id, entry_date, reference, narration, auto_posted: false, created_by: ctx.user.id })
    .select('id')
    .single();

  if (jeErr || !je) return NextResponse.json({ error: jeErr?.message ?? 'Failed to create journal entry' }, { status: 500 });

  const { error: linesErr } = await supabase
    .from('journal_entry_lines')
    .insert(lines.map((l) => ({
      journal_id:  je.id,
      account_id:  l.account_id,
      debit:       l.debit  ?? 0,
      credit:      l.credit ?? 0,
      description: l.description ?? null,
    })));

  if (linesErr) return NextResponse.json({ error: linesErr.message }, { status: 500 });
  return NextResponse.json({ id: je.id });
}
