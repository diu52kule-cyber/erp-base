import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rows } = await req.json() as { rows: Record<string, string>[] };
  if (!rows?.length) return NextResponse.json({ error: 'No rows provided' }, { status: 400 });

  const supabase = createClient();
  const records = rows.map((r) => ({
    org_id: ctx.org!.id,
    name: (r.name || r.Name || '').trim(),
    sku: r.sku || r.SKU || null,
    unit: r.unit || r.Unit || 'pcs',
    selling_price: parseFloat(r.selling_price || r['Selling Price'] || '0') || 0,
    gst_rate: parseFloat(r.gst_rate || r['GST Rate'] || '18') || 18,
    stock_qty: parseFloat(r.stock_qty || r['Opening Stock'] || '0') || 0,
    low_stock_threshold: parseFloat(r.low_stock_threshold || r['Low Stock'] || '0') || 0,
    description: r.description || r.Description || null,
  })).filter((r) => r.name);

  if (!records.length) return NextResponse.json({ error: 'No valid rows (name column missing?)' }, { status: 400 });

  const { error } = await supabase.from('products').insert(records);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ imported: records.length });
}
