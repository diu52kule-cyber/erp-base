import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { exportOrgData, isBackupDue, refreshGoogleToken, uploadToDrive } from '@/lib/backup/export';
import { decryptToken, encryptToken } from '@/lib/crypto/tokens';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth   = req.headers.get('authorization');
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: allSettings } = await admin
    .from('org_backup_settings')
    .select('org_id, frequency, last_backup_at, drive_connected, access_token, refresh_token, token_expiry, drive_folder_id')
    .neq('frequency', 'off');

  let backed = 0;
  const errors: string[] = [];

  for (const s of allSettings ?? []) {
    if (!isBackupDue(s.frequency as string, s.last_backup_at as string | null)) continue;

    try {
      const { json, size, fileName } = await exportOrgData(s.org_id as string);

      let driveFileId: string | null = null;

      if (s.drive_connected && s.refresh_token) {
        const storedRefresh = decryptToken(s.refresh_token as string);
        let accessToken = s.access_token ? decryptToken(s.access_token as string) : null;

        if (!accessToken || new Date(s.token_expiry as string) < new Date()) {
          const refreshed = await refreshGoogleToken(storedRefresh);
          if (refreshed) {
            accessToken = refreshed.access_token;
            await admin.from('org_backup_settings').update({
              access_token: encryptToken(accessToken),
              token_expiry: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
            }).eq('org_id', s.org_id);
          }
        }

        if (accessToken) {
          driveFileId = await uploadToDrive(accessToken, s.drive_folder_id as string | null, fileName, json);
        }
      }

      await Promise.all([
        admin.from('backup_history').insert({
          org_id:        s.org_id,
          status:        'success',
          file_name:     fileName,
          file_size:     size,
          drive_file_id: driveFileId,
        }),
        admin.from('org_backup_settings').update({
          last_backup_at:      new Date().toISOString(),
          last_backup_size:    size,
          last_backup_file_id: driveFileId,
          updated_at:          new Date().toISOString(),
        }).eq('org_id', s.org_id),
      ]);

      backed++;
    } catch (e: any) {
      errors.push(`${s.org_id}: ${e.message as string}`);
      try {
        await admin.from('backup_history').insert({
          org_id:        s.org_id,
          status:        'failed',
          error_message: e.message,
        });
      } catch { /* ignore */ }
    }
  }

  return NextResponse.json({ backed, errors });
}
