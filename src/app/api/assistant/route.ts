import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

async function buildSnapshot(orgId: string, org: { name: string; business_type?: string }, has: (k: string) => boolean) {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const fyStart = now.getMonth() >= 3
    ? `${now.getFullYear()}-04-01`
    : `${now.getFullYear() - 1}-04-01`;
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lines: string[] = [];

  // Business identity
  lines.push(`BUSINESS: "${org.name}" · Type: ${org.business_type ?? 'general'} · Today: ${today}`);

  // Team headcount
  try {
    const { count } = await supabase.from('memberships').select('id', { count: 'exact', head: true }).eq('org_id', orgId);
    lines.push(`TEAM: ${count ?? 0} member(s) in this organization.`);
  } catch {}

  if (has('billing')) {
    try {
      const [{ data: fyInv }, { data: monthInv }, { data: unpaidInv }] = await Promise.all([
        supabase.from('invoices').select('total,status').eq('org_id', orgId).eq('doc_type', 'invoice').gte('issue_date', fyStart),
        supabase.from('invoices').select('total,status').eq('org_id', orgId).eq('doc_type', 'invoice').gte('issue_date', monthStart),
        supabase.from('invoices').select('total,customer_name,due_date').eq('org_id', orgId).eq('doc_type', 'invoice').not('status', 'in', '("paid","draft","cancelled")').order('due_date').limit(10),
      ]);
      const fyRevenue = (fyInv ?? []).filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.total ?? 0), 0);
      const monthRevenue = (monthInv ?? []).filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.total ?? 0), 0);
      const unpaidTotal = (unpaidInv ?? []).reduce((s, i) => s + Number(i.total ?? 0), 0);
      lines.push(`REVENUE: ₹${fyRevenue.toLocaleString('en-IN')} this FY · ₹${monthRevenue.toLocaleString('en-IN')} this month.`);
      if ((unpaidInv ?? []).length) {
        lines.push(`UNPAID INVOICES: ${unpaidInv?.length} invoices totalling ₹${unpaidTotal.toLocaleString('en-IN')} outstanding.`);
        const overdue = (unpaidInv ?? []).filter((i) => i.due_date && i.due_date < today);
        if (overdue.length) lines.push(`OVERDUE: ${overdue.length} invoice(s) past due date — ${overdue.map((i) => i.customer_name).slice(0, 5).join(', ')}.`);
      }
    } catch {}
  }

  if (has('crm')) {
    try {
      const [{ data: contacts }, { data: deals }] = await Promise.all([
        supabase.from('contacts').select('type').eq('org_id', orgId).is('archived_at', null),
        supabase.from('deals').select('value,stage').eq('org_id', orgId),
      ]);
      const leads = (contacts ?? []).filter((c) => c.type === 'lead').length;
      const customers = (contacts ?? []).filter((c) => c.type === 'customer').length;
      lines.push(`CRM: ${customers} customer(s), ${leads} lead(s).`);
      if ((deals ?? []).length) {
        const openDeals = (deals ?? []).filter((d) => !['won', 'lost'].includes(d.stage));
        const pipeline = openDeals.reduce((s, d) => s + Number(d.value ?? 0), 0);
        const won = (deals ?? []).filter((d) => d.stage === 'won').reduce((s, d) => s + Number(d.value ?? 0), 0);
        lines.push(`DEALS: ${openDeals.length} open, pipeline ₹${pipeline.toLocaleString('en-IN')} · Won ₹${won.toLocaleString('en-IN')}.`);
      }
    } catch {}
  }

  if (has('hr')) {
    try {
      const { count: empCount } = await supabase.from('employees').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'active');
      lines.push(`HR: ${empCount ?? 0} active employee(s).`);
    } catch {}
    try {
      const { data: lr } = await supabase.from('leave_requests').select('id').eq('org_id', orgId).eq('status', 'pending').limit(20);
      if ((lr ?? []).length) lines.push(`LEAVE: ${lr?.length} pending leave request(s) awaiting approval.`);
    } catch {}
  }

  if (has('inventory')) {
    try {
      const { data: products } = await supabase.from('products').select('name,stock_qty,low_stock_threshold').eq('org_id', orgId).is('archived_at', null).limit(500);
      const low = (products ?? []).filter((p) => p.stock_qty != null && p.low_stock_threshold != null && p.stock_qty <= p.low_stock_threshold);
      const outOfStock = low.filter((p) => p.stock_qty === 0);
      lines.push(`INVENTORY: ${low.length} item(s) at/below low-stock threshold${outOfStock.length ? `, ${outOfStock.length} out of stock` : ''}.`);
      if (low.length) lines.push(`Low stock items: ${low.slice(0, 10).map((p) => p.name).join('; ')}.`);
    } catch {}
  }

  if (has('tasks')) {
    try {
      const { data: tasks } = await supabase.from('tasks').select('title,status,priority,due_date').eq('org_id', orgId).limit(300);
      const t = tasks ?? [];
      const open = t.filter((x) => x.status !== 'done');
      const overdue = open.filter((x) => x.due_date && x.due_date < today);
      const highPri = open.filter((x) => x.priority === 'high');
      lines.push(`TASKS: ${open.length} open (${highPri.length} high-priority, ${overdue.length} overdue).`);
      if (overdue.length) lines.push(`Overdue tasks: ${overdue.slice(0, 8).map((x) => x.title).join('; ')}.`);
    } catch {}
  }

  if (has('issues')) {
    try {
      const { data: issues } = await supabase.from('issues').select('title,severity,status').eq('org_id', orgId).neq('status', 'closed').limit(100);
      const crit = (issues ?? []).filter((x) => x.severity === 'critical');
      if ((issues ?? []).length) lines.push(`ISSUES: ${issues?.length} open${crit.length ? `, ${crit.length} critical` : ''}.`);
      if (crit.length) lines.push(`Critical: ${crit.slice(0, 5).map((x) => x.title).join('; ')}.`);
    } catch {}
  }

  if (has('goals')) {
    try {
      const { data: goals } = await supabase.from('goals').select('title,progress,status').eq('org_id', orgId).limit(20);
      const behind = (goals ?? []).filter((g) => g.status === 'at_risk' || g.status === 'off_track');
      if ((goals ?? []).length) lines.push(`GOALS: ${goals?.length} OKRs · ${behind.length} at risk / off track.`);
      (goals ?? []).slice(0, 5).forEach((g) => lines.push(`  Goal "${g.title}": ${g.progress}%`));
    } catch {}
  }

  if (has('expenses')) {
    try {
      const { data: exp } = await supabase.from('expense_claims').select('amount').eq('org_id', orgId).eq('status', 'submitted');
      if ((exp ?? []).length) {
        const total = (exp ?? []).reduce((s, e) => s + Number(e.amount ?? 0), 0);
        lines.push(`EXPENSES: ${exp?.length} pending claim(s) totalling ₹${total.toLocaleString('en-IN')} awaiting approval.`);
      }
    } catch {}
  }

  if (has('checkins')) {
    try {
      const { data: c } = await supabase.from('checkins').select('blockers').eq('org_id', orgId).eq('checkin_date', today);
      const withBlockers = (c ?? []).filter((x) => x.blockers);
      if ((c ?? []).length) lines.push(`CHECK-INS today: ${c?.length}, ${withBlockers.length} reporting blockers.`);
    } catch {}
  }

  return lines.join('\n');
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { question } = await req.json();
  if (!question) return NextResponse.json({ error: 'Ask a question' }, { status: 400 });

  const snapshot = await buildSnapshot(ctx.org.id, { name: ctx.org.name, business_type: (ctx.org as any).business_type }, (k) => ctx.enabledModules.has(k));
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      answer: `AI is not configured yet (set ANTHROPIC_API_KEY). Here's your live workspace snapshot:\n\n${snapshot || 'No workspace data yet.'}`,
      snapshot: true,
    });
  }

  // A4: Check monthly token cap
  const supabase = createClient();
  try {
    const { data: plan } = await supabase.from('org_plans').select('ai_tokens_used_month,ai_tokens_cap_month,ai_token_reset_date').eq('org_id', ctx.org.id).maybeSingle();
    if (plan) {
      const resetDate = new Date(plan.ai_token_reset_date ?? '2000-01-01');
      const now = new Date();
      const shouldReset = now.getFullYear() > resetDate.getFullYear() || now.getMonth() > resetDate.getMonth();
      if (shouldReset) {
        await supabase.from('org_plans').update({ ai_tokens_used_month: 0, ai_token_reset_date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01` }).eq('org_id', ctx.org.id);
      } else if ((plan.ai_tokens_used_month ?? 0) >= (plan.ai_tokens_cap_month ?? 100000)) {
        return NextResponse.json({ error: 'Monthly AI token limit reached. Contact support to increase your limit.' }, { status: 429 });
      }
    }
  } catch { /* non-fatal — proceed */ }

  try {
    const systemPrompt =
      `You are the AI business assistant for "${ctx.org.name}" (${(ctx.org as any).business_type ?? 'general'} business). ` +
      `You have access to a live workspace snapshot from their ERP system. ` +
      `Answer concisely and practically using the snapshot. If data is absent, say so. ` +
      `Format with short bullets. Prioritize urgent items (overdue, blocked, critical) in answers.\n\n` +
      `LIVE WORKSPACE SNAPSHOT:\n${snapshot}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: systemPrompt,
        messages: [{ role: 'user', content: question }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: (err as any).error?.message ?? 'AI request failed' }, { status: 500 });
    }
    const data = await res.json();
    const answer = (data.content ?? []).map((b: { text?: string }) => b.text ?? '').join('').trim();

    // A4: Log usage
    const tokensIn  = data.usage?.input_tokens  ?? 0;
    const tokensOut = data.usage?.output_tokens ?? 0;
    try {
      await Promise.all([
        supabase.from('ai_usage').insert({ org_id: ctx.org.id, user_id: ctx.user.id, tokens_in: tokensIn, tokens_out: tokensOut }),
        supabase.rpc('increment_ai_tokens', { p_org_id: ctx.org.id, p_tokens: tokensIn + tokensOut }),
      ]);
    } catch { /* non-fatal */ }

    return NextResponse.json({ answer, snapshotLines: snapshot.split('\n').length });
  } catch {
    return NextResponse.json({ error: 'Could not reach the AI service.' }, { status: 500 });
  }
}
