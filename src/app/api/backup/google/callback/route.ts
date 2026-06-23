import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { encryptToken } from '@/lib/crypto/tokens';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Derive fallback base from the request itself
  const host  = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const reqBase = process.env.NEXT_PUBLIC_APP_URL ?? `${proto}://${host}`;

  // Try to get base from state (set by auth route); fall back to reqBase
  let base = reqBase;
  let orgId = '';
  try {
    const parsed = JSON.parse(Buffer.from(state ?? '', 'base64url').toString()) as {
      orgId: string; userId: string; base?: string;
    };
    orgId = parsed.orgId;
    if (parsed.base) base = parsed.base;
  } catch {
    return NextResponse.redirect(`${reqBase}/dashboard/settings/backup?error=invalid_state`);
  }

  if (error || !code || !orgId) {
    return NextResponse.redirect(`${base}/dashboard/settings/backup?error=cancelled`);
  }

  try {
    const clientId     = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri  = `${base}/api/backup/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json() as {
      access_token?: string; refresh_token?: string; expires_in?: number; error?: string;
    };
    if (!tokens.access_token) throw new Error(tokens.error ?? 'No access token');

    // Get connected Google account email
    const userRes  = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userRes.json() as { email?: string };

    // Create "ERP Backups" folder in Drive
    const folderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'ERP Backups',
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });
    const folder = await folderRes.json() as { id?: string };

    const expiry = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000);

    const admin = createAdminClient();
    await admin.from('org_backup_settings').upsert({
      org_id:          orgId,
      drive_connected: true,
      drive_email:     userInfo.email ?? null,
      drive_folder_id: folder.id ?? null,
      access_token:    encryptToken(tokens.access_token),
      refresh_token:   tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
      token_expiry:    expiry.toISOString(),
      updated_at:      new Date().toISOString(),
    }, { onConflict: 'org_id' });

    return NextResponse.redirect(`${base}/dashboard/settings/backup?success=connected`);
  } catch (e: any) {
    return NextResponse.redirect(
      `${base}/dashboard/settings/backup?error=${encodeURIComponent(e.message as string)}`,
    );
  }
}
