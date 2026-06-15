import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, business_type, city, phone, gstin, state_code } = await req.json();
  if (!name || !business_type) return NextResponse.json({ error: 'Name and business type required' }, { status: 400 });

  // Create org + owner membership via security-definer RPC
  const { data: orgId, error: rpcErr } = await supabase.rpc('create_organization', {
    p_name: name.trim(),
    p_business_type: business_type,
  });
  if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 500 });

  const admin = createAdminClient();
  const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Run all extras in parallel
  await Promise.all([
    // Store city + phone on org
    (city || phone) && admin.from('organizations').update({ city: city || null, phone: phone || null }).eq('id', orgId),

    // Upsert org_plans trial row
    admin.from('org_plans').upsert({
      org_id: orgId,
      plan_name: 'trial',
      status: 'trial',
      amount: 0,
      billing_period: 'monthly',
      next_billing_date: trialEnd,
      notes: `Trial started ${new Date().toLocaleDateString('en-IN')}`,
    }, { onConflict: 'org_id' }),

    // Save GST settings if provided
    gstin && admin.from('accounting_settings').upsert({
      org_id: orgId,
      gstin: gstin.toUpperCase().trim(),
      state_code: state_code || '',
      filing_period: 'monthly',
    }, { onConflict: 'org_id' }),
  ].filter(Boolean));

  return NextResponse.json({ success: true, org_id: orgId, trial_end: trialEnd });
}
