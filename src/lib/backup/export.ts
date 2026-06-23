import { createAdminClient } from '@/lib/supabase/admin';

const PAGE_SIZE = 1000;

async function safeSelect(
  admin: ReturnType<typeof createAdminClient>,
  table: string,
  orgId: string,
): Promise<unknown[]> {
  try {
    const all: unknown[] = [];
    let offset = 0;
    while (true) {
      const { data, error } = await admin
        .from(table)
        .select('*')
        .eq('org_id', orgId)
        .range(offset, offset + PAGE_SIZE - 1);
      if (error || !data || data.length === 0) break;
      all.push(...data);
      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
    return all;
  } catch {
    return [];
  }
}

export async function exportOrgData(orgId: string): Promise<{ json: string; size: number; fileName: string }> {
  const admin = createAdminClient();

  const { data: org } = await admin
    .from('organizations')
    .select('name, business_type')
    .eq('id', orgId)
    .maybeSingle();

  const [
    contacts, products, invoices, invoiceItems, payments,
    employees, deals, departments, teams, teamMembers,
    purchaseOrders, poItems, expenses, expenseCategories,
    leaveTypes, leaveRequests, tasks, projects, docs, goals, meetings,
    subscriptions, posOrders,
  ] = await Promise.all([
    safeSelect(admin, 'contacts',          orgId),
    safeSelect(admin, 'products',          orgId),
    safeSelect(admin, 'invoices',          orgId),
    safeSelect(admin, 'invoice_items',     orgId),
    safeSelect(admin, 'payments',          orgId),
    safeSelect(admin, 'employees',         orgId),
    safeSelect(admin, 'deals',             orgId),
    safeSelect(admin, 'departments',       orgId),
    safeSelect(admin, 'teams',             orgId),
    safeSelect(admin, 'team_memberships',  orgId),
    safeSelect(admin, 'purchase_orders',   orgId),
    safeSelect(admin, 'purchase_order_items', orgId),
    safeSelect(admin, 'expense_claims',    orgId),
    safeSelect(admin, 'expense_categories', orgId),
    safeSelect(admin, 'leave_types',       orgId),
    safeSelect(admin, 'leave_requests',    orgId),
    safeSelect(admin, 'tasks',             orgId),
    safeSelect(admin, 'projects',          orgId),
    safeSelect(admin, 'docs',              orgId),
    safeSelect(admin, 'goals',             orgId),
    safeSelect(admin, 'meetings',          orgId),
    safeSelect(admin, 'subscriptions',     orgId),
    safeSelect(admin, 'pos_orders',        orgId),
  ]);

  const payload = {
    version: '1.0',
    org_id: orgId,
    org_name: org?.name ?? 'Unknown',
    business_type: (org as any)?.business_type ?? 'general',
    exported_at: new Date().toISOString(),
    tables: {
      contacts,
      products,
      invoices,
      invoice_items: invoiceItems,
      payments,
      employees,
      deals,
      departments,
      teams,
      team_memberships: teamMembers,
      purchase_orders: purchaseOrders,
      purchase_order_items: poItems,
      expense_claims: expenses,
      expense_categories: expenseCategories,
      leave_types: leaveTypes,
      leave_requests: leaveRequests,
      tasks,
      projects,
      docs,
      goals,
      meetings,
      subscriptions,
      pos_orders: posOrders,
    },
  };

  const json = JSON.stringify(payload, null, 2);
  const size = Buffer.byteLength(json, 'utf8');
  const date = new Date().toISOString().split('T')[0];
  const safeName = (org?.name ?? 'org').replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const fileName = `erp-backup-${safeName}-${date}.json`;

  return { json, size, fileName };
}

export async function refreshGoogleToken(
  refreshToken: string,
): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
      }),
    });
    const data = await res.json();
    return data.access_token ? data : null;
  } catch {
    return null;
  }
}

export async function uploadToDrive(
  accessToken: string,
  folderId: string | null,
  fileName: string,
  content: string,
): Promise<string> {
  const boundary = 'erp_backup_boundary_x7k2';
  const metadata = JSON.stringify({
    name: fileName,
    mimeType: 'application/json',
    ...(folderId ? { parents: [folderId] } : {}),
  });

  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    metadata + '\r\n' +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    content + '\r\n' +
    `--${boundary}--`;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );

  const file = await res.json();
  if (!file.id) throw new Error((file.error?.message as string | undefined) ?? 'Upload to Google Drive failed');
  return file.id as string;
}

export function isBackupDue(frequency: string, lastBackupAt: string | null): boolean {
  if (frequency === 'off') return false;
  if (!lastBackupAt) return true;
  const diffMs = Date.now() - new Date(lastBackupAt).getTime();
  const diffDays = diffMs / 86_400_000;
  if (frequency === 'daily')   return diffDays >= 1;
  if (frequency === 'weekly')  return diffDays >= 7;
  if (frequency === 'monthly') return diffDays >= 30;
  return false;
}
