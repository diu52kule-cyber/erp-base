import { NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  try {
    const [settingsRes, historyRes] = await Promise.all([
      supabase
        .from('org_backup_settings')
        .select('frequency, last_backup_at, last_backup_size, drive_connected, drive_email, updated_at')
        .eq('org_id', ctx.org.id)
        .maybeSingle(),
      supabase
        .from('backup_history')
        .select('id, created_at, status, file_name, file_size, drive_file_id, error_message')
        .eq('org_id', ctx.org.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    return NextResponse.json({
      settings: settingsRes.data ?? { frequency: 'weekly', drive_connected: false },
      history:  historyRes.data ?? [],
      google_configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    });
  } catch {
    return NextResponse.json({
      settings: { frequency: 'weekly', drive_connected: false },
      history: [],
      google_configured: false,
    });
  }
}
