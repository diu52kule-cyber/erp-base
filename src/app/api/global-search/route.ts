import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ results: [] });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const supabase = await createClient();
  const orgId = ctx.org.id;
  const like  = `%${q}%`;

  const [invoicesRes, contactsRes, productsRes, tasksRes, posRes, projectsRes, meetingsRes, docsRes] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, invoice_number, customer_name, total, status, doc_type')
      .eq('org_id', orgId)
      .or(`invoice_number.ilike.${like},customer_name.ilike.${like}`)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('contacts')
      .select('id, name, company, email, type')
      .eq('org_id', orgId)
      .is('archived_at', null)
      .or(`name.ilike.${like},company.ilike.${like},email.ilike.${like}`)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('products')
      .select('id, name, sku, category, stock_qty')
      .eq('org_id', orgId)
      .is('archived_at', null)
      .or(`name.ilike.${like},sku.ilike.${like}`)
      .order('created_at', { ascending: false })
      .limit(5),
    // tasks (workspace)
    ctx.enabledModules.has('tasks')
      ? supabase
          .from('tasks')
          .select('id, title, status, project_id')
          .eq('org_id', orgId)
          .ilike('title', like)
          .order('created_at', { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
    // purchase orders
    ctx.enabledModules.has('purchase')
      ? supabase
          .from('purchase_orders')
          .select('id, po_number, vendor_name, total, status')
          .eq('org_id', orgId)
          .or(`po_number.ilike.${like},vendor_name.ilike.${like}`)
          .order('created_at', { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
    // projects
    ctx.enabledModules.has('projects')
      ? supabase
          .from('projects')
          .select('id, name, status')
          .eq('org_id', orgId)
          .ilike('name', like)
          .order('created_at', { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
    // meetings
    ctx.enabledModules.has('meetings')
      ? supabase
          .from('meetings')
          .select('id, title, scheduled_at, status')
          .eq('org_id', orgId)
          .ilike('title', like)
          .order('scheduled_at', { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
    // docs
    ctx.enabledModules.has('docs')
      ? supabase
          .from('documents')
          .select('id, title, type')
          .eq('org_id', orgId)
          .ilike('title', like)
          .order('updated_at', { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
  ]);

  const results: { type: string; id: string; title: string; subtitle: string; href: string }[] = [];

  for (const inv of invoicesRes.data ?? []) {
    results.push({
      type: 'invoice',
      id: inv.id,
      title: `${inv.invoice_number} — ${inv.customer_name}`,
      subtitle: `${inv.doc_type} · ${inv.status}`,
      href: `/dashboard/billing/${inv.id}`,
    });
  }
  for (const c of contactsRes.data ?? []) {
    results.push({
      type: 'contact',
      id: c.id,
      title: c.name,
      subtitle: `${c.type}${c.company ? ' · ' + c.company : ''}`,
      href: `/dashboard/crm/contacts/${c.id}`,
    });
  }
  for (const p of productsRes.data ?? []) {
    results.push({
      type: 'product',
      id: p.id,
      title: p.name,
      subtitle: `${p.sku ?? 'no SKU'} · stock ${p.stock_qty ?? 0}`,
      href: `/dashboard/inventory/${p.id}`,
    });
  }
  for (const t of (tasksRes.data ?? []) as any[]) {
    results.push({
      type: 'task',
      id: t.id,
      title: t.title,
      subtitle: `task · ${t.status}`,
      href: t.project_id ? `/dashboard/projects/${t.project_id}` : '/dashboard/tasks',
    });
  }
  for (const po of (posRes.data ?? []) as any[]) {
    results.push({
      type: 'purchase_order',
      id: po.id,
      title: `${po.po_number} — ${po.vendor_name}`,
      subtitle: `PO · ${po.status}`,
      href: `/dashboard/purchase/${po.id}`,
    });
  }
  for (const pr of (projectsRes.data ?? []) as any[]) {
    results.push({
      type: 'project',
      id: pr.id,
      title: pr.name,
      subtitle: `project · ${pr.status}`,
      href: `/dashboard/projects/${pr.id}`,
    });
  }
  for (const m of (meetingsRes.data ?? []) as any[]) {
    results.push({
      type: 'meeting',
      id: m.id,
      title: m.title,
      subtitle: `meeting · ${m.status ?? 'scheduled'}`,
      href: `/dashboard/meetings/${m.id}`,
    });
  }
  for (const d of (docsRes.data ?? []) as any[]) {
    results.push({
      type: 'doc',
      id: d.id,
      title: d.title,
      subtitle: `doc · ${d.type ?? 'document'}`,
      href: `/dashboard/docs/${d.id}`,
    });
  }

  return NextResponse.json({ results });
}
