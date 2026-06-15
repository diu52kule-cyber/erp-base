import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/entitlements";
import { MODULES } from "@/lib/modules";
import ThemeToggle from "@/components/ThemeToggle";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/types/roles";
import type { OrgRole } from "@/lib/types/roles";
import NotificationBell from "@/components/NotificationBell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");
  if (!ctx.org) redirect("/onboarding");

  const visible = MODULES.filter((m) => ctx.enabledModules.has(m.key));

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <aside className="w-64 shrink-0 border-r border-neutral-200 bg-white flex flex-col">
        {/* Top: theme toggle + workspace */}
        <div className="p-4 border-b border-neutral-100">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex-1"><ThemeToggle /></div>
            <NotificationBell />
          </div>
          <div className="text-xs text-neutral-500">Workspace</div>
          <div className="font-semibold text-sm">{ctx.org.name}</div>
          <div className="text-xs text-neutral-400 capitalize">{ctx.org.business_type}</div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 p-4 flex-1 overflow-y-auto">
          <Link href="/dashboard" className="rounded-md px-3 py-2 text-sm hover:bg-neutral-100">
            Overview
          </Link>
          {visible.map((m) => (
            <Link key={m.key} href={m.href} className="rounded-md px-3 py-2 text-sm hover:bg-neutral-100">
              {m.name}
            </Link>
          ))}
        </nav>

        {/* Bottom: current user role + settings */}
        <div className="p-4 border-t border-neutral-100 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 truncate">{ctx.user.email}</span>
            <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[ctx.org.role as OrgRole]}`}>
              {ROLE_LABELS[ctx.org.role as OrgRole]}
            </span>
          </div>
          <Link href="/dashboard/settings/team" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-neutral-100 text-neutral-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Link>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
