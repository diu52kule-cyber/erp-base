import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getOrgContext();
  if (!ctx) redirect('/login');

  const adminEmail = process.env.ADMIN_EMAIL;
  // If ADMIN_EMAIL is set, enforce it. If not set, allow any authenticated user.
  if (adminEmail && ctx.user.email !== adminEmail) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <aside className="w-56 shrink-0 border-r border-neutral-200 bg-white flex flex-col">
        <div className="p-4 border-b border-neutral-100">
          <div className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Admin Panel</div>
          <div className="mt-1 text-sm font-semibold text-neutral-800">ERP Platform</div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          <Link href="/admin" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900">
            <span className="text-lg">📊</span> Overview
          </Link>
          <Link href="/admin/clients" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900">
            <span className="text-lg">🏢</span> Clients
          </Link>
        </nav>
        <div className="p-4 border-t border-neutral-100">
          <Link href="/dashboard" className="text-xs text-neutral-400 hover:text-neutral-600">← Back to dashboard</Link>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
