import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOrgContext } from '@/lib/entitlements';
import { presetFor, BUSINESS_TYPES } from '@/lib/modules';
import type { OrgRole } from '@/lib/types/roles';

const ADMIN_TIER: OrgRole[] = ['owner', 'admin'];

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ADMIN_TIER.includes(ctx.org.role as OrgRole)) {
    return NextResponse.json({ error: 'Only owners and admins can change the business type' }, { status: 403 });
  }

  const { business_type } = await req.json();
  if (!BUSINESS_TYPES.some((b) => b.key === business_type)) {
    return NextResponse.json({ error: 'Invalid business type' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Update the org's business type
  const { error: orgErr } = await admin.from('organizations').update({ business_type }).eq('id', ctx.org.id);
  if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 });

  // Re-apply module entitlements to match the new business type's preset.
  // Only touch keys that exist in the catalog (entitlements FK to modules.key).
  const presetKeys = new Set(presetFor(business_type));
  const { data: catalog } = await admin.from('modules').select('key');
  const validKeys = (catalog ?? []).map((m) => m.key as string);
  if (validKeys.length) {
    const rows = validKeys.map((key) => ({ org_id: ctx.org!.id, module_key: key, enabled: presetKeys.has(key) }));
    await admin.from('entitlements').upsert(rows, { onConflict: 'org_id,module_key' });
  }

  return NextResponse.json({ success: true });
}
