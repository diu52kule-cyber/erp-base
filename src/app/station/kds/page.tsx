import { redirect } from 'next/navigation';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import KDSClient from './KDSClient';

export default async function KDSPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('pos') || !ctx.org) redirect('/login');

  const supabase = createClient();
  let orders: any[] = [];
  try {
    const { data } = await supabase
      .from('pos_orders')
      .select('id,order_number,table_label,customer_name,kds_status,total,created_at,lines:pos_order_lines(description,quantity)')
      .eq('org_id', ctx.org.id)
      .neq('kds_status', 'served')
      .order('created_at', { ascending: true });
    orders = data ?? [];
  } catch { /* kds_status column not yet added */ }

  return <KDSClient orgId={ctx.org.id} initialOrders={orders} />;
}
