import { NextRequest, NextResponse } from 'next/server';
import { signAdminToken, ADMIN_COOKIE } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;

  if (!adminUser || !adminPass) {
    return NextResponse.json({ error: 'Admin credentials not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD in environment variables.' }, { status: 503 });
  }

  const { username, password } = await req.json();

  if (username !== adminUser || password !== adminPass) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = signAdminToken(username);
  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60, // 8 hours
    path: '/',
  });
  return res;
}
