import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Auth is enforced by middleware (erp_admin_session cookie check)
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
          <Link href="/admin/settings" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900">
            <span className="text-lg">⚙️</span> Settings
          </Link>
        </nav>
        <div className="p-4 border-t border-neutral-100 space-y-2">
          <Link href="/dashboard" className="block text-xs text-neutral-400 hover:text-neutral-600">← Back to dashboard</Link>
          <AdminLogout />
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}

function AdminLogout() {
  return (
    <form action="/api/admin/auth/logout" method="POST">
      <button type="submit" className="text-xs text-red-400 hover:text-red-600">Sign out</button>
    </form>
  );
}
