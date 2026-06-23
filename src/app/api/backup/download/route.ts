import { NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';
import { exportOrgData } from '@/lib/backup/export';

// GET — download org backup as a JSON file (no Drive required)
export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { json, fileName } = await exportOrgData(ctx.org.id);

    return new NextResponse(json, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
