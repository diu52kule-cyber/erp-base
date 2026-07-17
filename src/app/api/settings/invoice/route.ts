import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

const FIELDS = [
  'bank_name', 'account_name', 'account_number', 'ifsc', 'branch', 'upi_id',
  'logo_url', 'signature_url', 'default_terms', 'default_notes',
] as const;

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createClient();
  const { data } = await supabase.from('org_invoice_settings').select('*').eq('org_id', ctx.org.id).maybeSingle();
  return NextResponse.json(data ?? {});
}

export async function PUT(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const row: Record<string, unknown> = { org_id: ctx.org.id, updated_at: new Date().toISOString() };
  for (const f of FIELDS) row[f] = (body[f] ?? '').toString().trim() || null;
  row.default_due_days = Math.max(0, parseInt(body.default_due_days) || 0);
  row.show_bank = body.show_bank !== false;
  row.show_upi_qr = body.show_upi_qr !== false;
  row.enable_round_off = body.enable_round_off !== false;

  // Bill format & print defaults
  row.template = ['classic', 'modern', 'compact'].includes(body.template) ? body.template : 'classic';
  row.accent_color = /^#[0-9a-fA-F]{6}$/.test((body.accent_color ?? '').toString().trim())
    ? body.accent_color.toString().trim() : '#171717';
  row.print_color_mode = body.print_color_mode === 'bw' ? 'bw' : 'color';
  row.print_copies = Math.min(4, Math.max(1, parseInt(body.print_copies) || 1));
  row.paper_size = ['A4', 'A5', 'thermal_80'].includes(body.paper_size) ? body.paper_size : 'A4';
  row.show_hsn = body.show_hsn !== false;
  row.show_logo = body.show_logo !== false;

  // Custom template + traditional-layout options
  row.use_custom_template = body.use_custom_template === true;
  row.custom_template_html = (body.custom_template_html ?? '').toString().slice(0, 60000) || null;
  row.invoice_title = (body.invoice_title ?? '').toString().trim().slice(0, 60) || null;
  row.header_note = (body.header_note ?? '').toString().trim().slice(0, 300) || null;
  row.footer_note = (body.footer_note ?? '').toString().trim().slice(0, 300) || null;
  row.show_gst_summary = body.show_gst_summary === true;
  row.show_signature = body.show_signature !== false;

  const supabase = createClient();
  const { error } = await supabase.from('org_invoice_settings').upsert(row, { onConflict: 'org_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
