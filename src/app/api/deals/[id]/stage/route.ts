import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import { DEAL_STAGES } from '@/lib/types/crm';
import { fireTrigger } from '@/lib/automations';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('crm')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { stage } = await req.json();

  if (!DEAL_STAGES.includes(stage)) {
    return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });
  }

  const supabase = await createClient();

  // Fetch current stage to detect transition
  const { data: deal } = await supabase
    .from('deals')
    .select('stage, name, contact_id, contacts(name)')
    .eq('id', id)
    .eq('org_id', ctx.org.id)
    .single();

  const { error } = await supabase
    .from('deals')
    .update({ stage })
    .eq('id', id)
    .eq('org_id', ctx.org.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fire automations for deal_won transition
  const orgId = ctx.org.id;
  if (stage === 'won' && deal?.stage !== 'won') {
    fireTrigger(orgId, 'deal_won', {
      deal_id: id,
      deal_name: deal?.name ?? '',
      contact_id: deal?.contact_id ?? '',
      contact_name: (deal?.contacts as any)?.name ?? '',
    }).catch(() => {});
  }
  // Fire automations for deal stage change
  fireTrigger(orgId, 'deal_stage_change', {
    deal_id: id,
    deal_name: deal?.name ?? '',
    old_stage: deal?.stage ?? '',
    new_stage: stage,
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
