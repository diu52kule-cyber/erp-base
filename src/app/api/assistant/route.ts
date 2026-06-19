import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

// Builds a compact, RLS-scoped snapshot of the org's workspace for the AI to reason over.
async function buildSnapshot(orgId: string, has: (k: string) => boolean) {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];
  const lines: string[] = [];

  if (has('tasks')) {
    const { data: tasks } = await supabase.from('tasks').select('title, status, priority, due_date').eq('org_id', orgId).limit(300);
    const t = tasks ?? [];
    const open = t.filter((x) => x.status !== 'done');
    const blocked = t.filter((x) => x.status === 'blocked');
    const overdue = open.filter((x) => x.due_date && x.due_date < today);
    lines.push(`TASKS: ${t.length} total, ${open.length} open, ${blocked.length} blocked, ${overdue.length} overdue.`);
    if (blocked.length) lines.push(`Blocked tasks: ${blocked.slice(0, 10).map((x) => x.title).join('; ')}.`);
    if (overdue.length) lines.push(`Overdue tasks: ${overdue.slice(0, 10).map((x) => x.title).join('; ')}.`);
  }
  if (has('issues')) {
    const { data: issues } = await supabase.from('issues').select('title, severity, status').eq('org_id', orgId).neq('status', 'closed').limit(100);
    const i = issues ?? [];
    const crit = i.filter((x) => x.severity === 'critical');
    lines.push(`ISSUES: ${i.length} open, ${crit.length} critical.`);
    if (crit.length) lines.push(`Critical issues: ${crit.slice(0, 10).map((x) => x.title).join('; ')}.`);
  }
  if (has('goals')) {
    const { data: goals } = await supabase.from('goals').select('title, progress, status').eq('org_id', orgId).limit(50);
    (goals ?? []).forEach((g) => lines.push(`GOAL: "${g.title}" — ${g.progress}% (${g.status}).`));
  }
  if (has('checkins')) {
    const { data: c } = await supabase.from('checkins').select('blockers').eq('org_id', orgId).eq('checkin_date', today);
    const withBlockers = (c ?? []).filter((x) => x.blockers);
    lines.push(`CHECK-INS today: ${(c ?? []).length}, ${withBlockers.length} reporting blockers.`);
  }
  if (has('inventory')) {
    const { data: products } = await supabase.from('products').select('name, quantity, low_stock_threshold').eq('org_id', orgId).limit(500);
    const low = (products ?? []).filter((p: { quantity?: number; low_stock_threshold?: number }) =>
      p.quantity != null && p.low_stock_threshold != null && p.quantity <= p.low_stock_threshold);
    lines.push(`INVENTORY: ${low.length} item(s) at/below low-stock threshold.`);
    if (low.length) lines.push(`Low stock: ${low.slice(0, 15).map((p: { name: string }) => p.name).join('; ')}.`);
  }
  if (has('billing')) {
    const { data: inv } = await supabase.from('invoices').select('total, status').eq('org_id', orgId).limit(1000);
    const unpaid = (inv ?? []).filter((x) => x.status !== 'paid' && x.status !== 'draft');
    const unpaidTotal = unpaid.reduce((s, x) => s + Number(x.total ?? 0), 0);
    lines.push(`BILLING: ${unpaid.length} unpaid invoice(s) worth ₹${unpaidTotal.toLocaleString('en-IN')}.`);
  }

  return lines.join('\n');
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { question } = await req.json();
  if (!question) return NextResponse.json({ error: 'Ask a question' }, { status: 400 });

  const snapshot = await buildSnapshot(ctx.org.id, (k) => ctx.enabledModules.has(k));
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      answer: `AI is not configured yet (set ANTHROPIC_API_KEY). Here's your live workspace snapshot:\n\n${snapshot || 'No workspace data yet.'}`,
      snapshot: true,
    });
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 700,
        system:
          `You are the AI operations assistant for "${ctx.org.name}", a business using this ERP/Startup-OS. ` +
          `Answer concisely and practically using ONLY the workspace snapshot below. If the snapshot lacks the data, say so. ` +
          `Prefer short bullet points and concrete next steps.\n\nWORKSPACE SNAPSHOT:\n${snapshot}`,
        messages: [{ role: 'user', content: question }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err.error?.message ?? 'AI request failed' }, { status: 500 });
    }
    const data = await res.json();
    const answer = (data.content ?? []).map((b: { text?: string }) => b.text ?? '').join('').trim();
    return NextResponse.json({ answer });
  } catch {
    return NextResponse.json({ error: 'Could not reach the AI service.' }, { status: 500 });
  }
}
