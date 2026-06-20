import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import Gstr2Client from './Gstr2Client';

export default async function Gstr2Page({ searchParams }: { searchParams: { period?: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('accounting') || !ctx.org) redirect('/dashboard');

  const now = new Date();
  const defaultPeriod = searchParams.period ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/accounting" className="text-sm text-neutral-500 hover:text-neutral-900">← GST & Accounting</Link>
        <h1 className="mt-1 text-2xl font-semibold">GSTR-2 (Purchases / ITC)</h1>
        <p className="mt-1 text-sm text-neutral-500">Inward supplies & input tax credit from vendor bills — B2B and unregistered.</p>
      </div>
      <Gstr2Client initialPeriod={defaultPeriod} />
    </div>
  );
}
