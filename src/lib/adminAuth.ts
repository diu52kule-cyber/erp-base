import crypto from 'crypto';
import { NextRequest } from 'next/server';

export const ADMIN_COOKIE = 'erp_admin_session';

function secret() {
  return process.env.ADMIN_SECRET ?? 'dev-secret-change-in-production';
}

export function signAdminToken(username: string): string {
  const payload = Buffer.from(
    JSON.stringify({ u: username, exp: Date.now() + 8 * 60 * 60 * 1000 }) // 8h
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyAdminToken(token: string): boolean {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return false;
    const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
    if (sig !== expected) return false;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof data.exp === 'number' && data.exp > Date.now();
  } catch {
    return false;
  }
}

export function isAdminRequest(req: NextRequest): boolean {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  return !!token && verifyAdminToken(token);
}
