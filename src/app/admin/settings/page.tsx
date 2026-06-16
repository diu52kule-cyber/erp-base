import { createAdminClient } from '@/lib/supabase/admin';
import AdminSettings from './AdminSettings';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const admin = createAdminClient();
  const { data } = await admin.from('platform_settings').select('*').eq('id', 1).maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Platform Settings</h1>
        <p className="text-sm text-neutral-400 mt-1">Billing contact details shown to clients when their trial ends.</p>
      </div>
      <AdminSettings initial={data ?? {}} />
    </div>
  );
}
