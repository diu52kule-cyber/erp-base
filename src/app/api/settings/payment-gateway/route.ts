import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

// Uses org_gst_settings table extended with gateway fields, or a simple json column
// We'll use a dedicated table via a simple key-value store approach in org settings
export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Return env-based config availability (keys should be per-org in production)
  return NextResponse.json({
    razorpay_configured: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    razorpay_key_id:     process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.substring(0, 8) + '…' : null,
    stripe_configured:   !!(process.env.STRIPE_SECRET_KEY),
  });
}
