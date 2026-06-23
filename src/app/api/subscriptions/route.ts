import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import { BILLING_CYCLE_MONTHS } from '@/lib/types/subscriptions';
import type { BillingCycle } from '@/lib/types/subscriptions';

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('subscriptions')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { plan_id, customer_name, customer_email, status, starts_at, notes } = await req.json();
  if (!customer_name?.trim()) return NextResponse.json({ error: 'Customer name required' }, { status: 400 });

  const supabase = createClient();

  // Calculate next billing date from plan cycle
  let next_billing_at: string | null = null;
  let ends_at: string | null = null;
  if (plan_id) {
    const { data: plan } = await supabase.from('subscription_plans').select('billing_cycle').eq('id', plan_id).single();
    if (plan) {
      const start = new Date(starts_at || new Date());
      const months = BILLING_CYCLE_MONTHS[plan.billing_cycle as BillingCycle];
      const next = new Date(start);
      next.setMonth(next.getMonth() + months);
      next_billing_at = next.toISOString().split('T')[0];
    }
  }

  const { data, error } = await supabase
    .from('customer_subscriptions')
    .insert({
      org_id: ctx.org.id,
      plan_id: plan_id || null,
      customer_name: customer_name.trim(),
      customer_email: customer_email || null,
      status: status || 'active',
      starts_at: starts_at || new Date().toISOString().split('T')[0],
      ends_at,
      next_billing_at,
      notes: notes || null,
    })
    .select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
