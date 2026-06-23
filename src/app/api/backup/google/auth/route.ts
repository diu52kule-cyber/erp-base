import { NextRequest, NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

function appBase(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const base = appBase(req);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(`${base}/dashboard/settings/backup?error=not_configured`);
  }

  const redirectUri = `${base}/api/backup/google/callback`;
  // Embed base URL in state so the callback always uses the same origin
  const state = Buffer.from(
    JSON.stringify({ orgId: ctx.org.id, userId: ctx.user.id, base }),
  ).toString('base64url');

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);

  return NextResponse.redirect(url.toString());
}
