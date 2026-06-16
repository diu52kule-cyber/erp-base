import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  const url = new URL('/admin/login', req.url);
  const res = NextResponse.redirect(url);
  res.cookies.set(ADMIN_COOKIE, '', { maxAge: 0, path: '/' });
  return res;
}
