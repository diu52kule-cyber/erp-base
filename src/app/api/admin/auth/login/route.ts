import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { signAdminToken, ADMIN_COOKIE } from '@/lib/adminAuth';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// In-memory store: works in dev and adds friction in prod (stateless serverless = best-effort)
const attempts = new Map<string, { count: number; resetAt: number }>();

function getIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

function isRateLimited(ip: string): { limited: boolean; retryAfterSecs: number } {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { limited: false, retryAfterSecs: 0 };
  }

  entry.count += 1;

  if (entry.count > MAX_ATTEMPTS) {
    return { limited: true, retryAfterSecs: Math.ceil((entry.resetAt - now) / 1000) };
  }

  return { limited: false, retryAfterSecs: 0 };
}

function timingSafeCompare(a: string, b: string): boolean {
  // Pad to same length before comparing to avoid short-circuit timing leak
  const aBuf = Buffer.from(a.padEnd(256));
  const bBuf = Buffer.from(b.padEnd(256));
  return aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);
}

export async function POST(req: NextRequest) {
  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;

  if (!adminUser || !adminPass) {
    return NextResponse.json(
      { error: 'Admin credentials not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD.' },
      { status: 503 }
    );
  }

  const ip = getIP(req);
  const { limited, retryAfterSecs } = isRateLimited(ip);

  if (limited) {
    return NextResponse.json(
      { error: `Too many failed attempts. Try again in ${Math.ceil(retryAfterSecs / 60)} minute(s).` },
      { status: 429, headers: { 'Retry-After': String(retryAfterSecs) } }
    );
  }

  let body: { username?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { username, password } = body;

  if (typeof username !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Timing-safe comparison — prevents username enumeration via response time
  const userMatch = timingSafeCompare(username, adminUser);
  const passMatch = timingSafeCompare(password, adminPass);

  if (!userMatch || !passMatch) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Successful login — clear the rate-limit counter for this IP
  attempts.delete(ip);

  const token = signAdminToken(username);
  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60,
    path: '/',
  });
  return res;
}
