import { NextRequest, NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';
import { createAdminClient } from '@/lib/supabase/admin';

// PATCH — update backup frequency
export async function PATCH(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { frequency?: string };
  const allowed = ['daily', 'weekly', 'monthly', 'off'];
  if (!body.frequency || !allowed.includes(body.frequency)) {
    return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin.from('org_backup_settings').upsert(
    { org_id: ctx.org.id, frequency: body.frequency, updated_at: new Date().toISOString() },
    { onConflict: 'org_id' },
  );

  return NextResponse.json({ ok: true });
}

// DELETE — disconnect Google Drive
export async function DELETE() {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  await admin.from('org_backup_settings').update({
    drive_connected: false,
    drive_email: null,
    drive_folder_id: null,
    access_token: null,
    refresh_token: null,
    token_expiry: null,
    updated_at: new Date().toISOString(),
  }).eq('org_id', ctx.org.id);

  return NextResponse.json({ ok: true });
}
