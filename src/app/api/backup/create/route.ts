import { NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { exportOrgData, refreshGoogleToken, uploadToDrive } from '@/lib/backup/export';
import { decryptToken, encryptToken } from '@/lib/crypto/tokens';

export async function POST() {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const admin    = createAdminClient();

  try {
    const { data: settings } = await supabase
      .from('org_backup_settings')
      .select('drive_connected, drive_folder_id, access_token, refresh_token, token_expiry, frequency')
      .eq('org_id', ctx.org.id)
      .maybeSingle();

    const { json, size, fileName } = await exportOrgData(ctx.org.id);

    let driveFileId: string | null = null;
    let driveError: string | null = null;

    if (settings?.drive_connected && settings.refresh_token) {
      const storedRefresh = decryptToken(settings.refresh_token as string);
      let accessToken = settings.access_token ? decryptToken(settings.access_token as string) : null;

      // Refresh token if expired or missing
      if (!accessToken || new Date(settings.token_expiry as string) < new Date()) {
        const refreshed = await refreshGoogleToken(storedRefresh);
        if (refreshed) {
          accessToken = refreshed.access_token;
          await admin.from('org_backup_settings').update({
            access_token: encryptToken(accessToken),
            token_expiry: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          }).eq('org_id', ctx.org.id);
        }
      }

      if (accessToken) {
        try {
          driveFileId = await uploadToDrive(accessToken, settings.drive_folder_id as string | null, fileName, json);
        } catch (e: any) {
          driveError = e.message as string;
        }
      }
    }

    // Log to backup history
    await admin.from('backup_history').insert({
      org_id:        ctx.org.id,
      status:        driveError && !driveFileId ? 'failed' : 'success',
      file_name:     fileName,
      file_size:     size,
      drive_file_id: driveFileId,
      error_message: driveError,
    });

    // Update last_backup_at
    await admin.from('org_backup_settings').upsert({
      org_id:               ctx.org.id,
      frequency:            settings?.frequency ?? 'weekly',
      last_backup_at:       new Date().toISOString(),
      last_backup_size:     size,
      last_backup_file_id:  driveFileId,
      updated_at:           new Date().toISOString(),
    }, { onConflict: 'org_id' });

    return NextResponse.json({
      ok:            true,
      fileName,
      size,
      driveFileId,
      driveConnected: settings?.drive_connected ?? false,
      driveError,
    });
  } catch (e: any) {
    try {
      await admin.from('backup_history').insert({
        org_id:        ctx.org.id,
        status:        'failed',
        error_message: e.message,
      });
    } catch { /* ignore logging failures */ }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
