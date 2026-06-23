import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('crm')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const {
    name, email, phone, type, company, gstin, address, notes,
    tags, lead_source, opening_balance,
  } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const supabase = createClient();

  // Duplicate detection: check email or phone match
  let duplicate: { id: string; name: string } | null = null;
  if (email || phone) {
    const conditions: string[] = [];
    if (email) conditions.push(`email.eq.${email}`);
    if (phone) conditions.push(`phone.eq.${phone}`);

    const { data: dups } = await supabase
      .from('contacts')
      .select('id, name')
      .eq('org_id', ctx.org.id)
      .or(conditions.join(','))
      .limit(1);

    if (dups?.length) duplicate = dups[0] as { id: string; name: string };
  }
  // Name match fallback
  if (!duplicate) {
    const { data: nameDups } = await supabase
      .from('contacts')
      .select('id, name')
      .eq('org_id', ctx.org.id)
      .ilike('name', name.trim())
      .limit(1);
    if (nameDups?.length) duplicate = nameDups[0] as { id: string; name: string };
  }

  const tagsArray: string[] = Array.isArray(tags)
    ? tags
    : typeof tags === 'string' && tags.trim()
      ? tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : [];

  const { data, error } = await supabase
    .from('contacts')
    .insert({
      org_id: ctx.org.id,
      name: name.trim(),
      email: email || null,
      phone: phone || null,
      type: type || 'lead',
      company: company || null,
      gstin: gstin || null,
      address: address || null,
      notes: notes || null,
      tags: tagsArray,
      lead_source: lead_source || null,
      opening_balance: Number(opening_balance) || 0,
      created_by: ctx.user.id,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Seed opening balance into ledger
  const ob = Number(opening_balance);
  if (ob > 0) {
    try {
      await supabase.from('ledger_entries').insert({
        org_id: ctx.org.id,
        contact_id: data.id,
        entry_date: new Date().toISOString().split('T')[0],
        type: 'opening',
        amount: ob,
        note: 'Opening balance',
        created_by: ctx.user.id,
      });
    } catch { /* non-fatal if ledger table not yet migrated */ }
  }

  return NextResponse.json({ id: data.id, duplicate });
}
