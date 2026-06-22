import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import QROrderForm from './QROrderForm';

export default async function QROrderPage({ params }: { params: { token: string } }) {
  const admin = createAdminClient();

  // Look up table by QR token
  let table: any = null;
  let products: any[] = [];

  try {
    const { data: t } = await admin
      .from('pos_tables')
      .select('id, name, org_id, status')
      .eq('qr_token', params.token)
      .single();
    table = t;
  } catch {
    notFound();
  }

  if (!table) notFound();

  // Fetch products for this org
  try {
    const { data } = await admin
      .from('products')
      .select('id, name, selling_price, category, gst_rate, stock_qty')
      .eq('org_id', table.org_id)
      .eq('is_active', true)
      .order('category')
      .order('name');
    products = data ?? [];
  } catch { products = []; }

  // Fetch org name
  let orgName = '';
  try {
    const { data: org } = await admin
      .from('organizations')
      .select('name')
      .eq('id', table.org_id)
      .single();
    orgName = org?.name ?? '';
  } catch {}

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white px-4 py-3">
        <p className="text-xs text-neutral-400 uppercase tracking-wider">{orgName}</p>
        <h1 className="text-lg font-semibold">Order from Table {table.name}</h1>
      </div>
      <div className="max-w-lg mx-auto px-4 pb-8">
        <QROrderForm token={params.token} tableName={table.name} products={products} />
      </div>
    </div>
  );
}
