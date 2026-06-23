import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('subscriptions')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { name, description, price, billing_cycle, features } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from('subscription_plans')
    .insert({
      org_id: ctx.org.id,
      name: name.trim(),
      description: description || null,
      price: parseFloat(price) || 0,
      billing_cycle: billing_cycle || 'monthly',
      features: Array.isArray(features) ? features.filter(Boolean) : [],
    })
    .select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
