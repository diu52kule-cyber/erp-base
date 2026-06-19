import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/entitlements";
import { MODULES, CATEGORY_LABELS, type ModuleCategory } from "@/lib/modules";
import ThemeToggle from "@/components/ThemeToggle";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/types/roles";
import type { OrgRole } from "@/lib/types/roles";
import NotificationBell from "@/components/NotificationBell";
import { Brand } from "@/components/Brand";
import SidebarNav from "@/components/SidebarNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");
  if (!ctx.org) redirect("/onboarding");
  if (ctx.access === "locked") redirect("/locked");

  const visible = MODULES.filter((m) => ctx.enabledModules.has(m.key));
  const order: ModuleCategory[] = ["business", "workspace"];
  const groups = order
    .map((cat) => ({
      cat,
      label: CATEGORY_LABELS[cat],
      items: visible
        .filter((m) => m.category === cat)
        .map((m) => ({ key: m.key, name: m.name, href: m.href, icon: m.icon })),
    }))
    .filter((g) => g.items.length > 0);
  const showTrialBanner = ctx.access === "trial" && ctx.trialDaysLeft !== null;
  const initial = (ctx.org.name?.[0] ?? "?").toUpperCase();

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <aside className="flex w-64 shrink-0 flex-col border-r border-neutral-200 bg-white">
        {/* Brand + controls */}
        <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3.5">
          <Brand className="flex-1" />
          <NotificationBell />
        </div>

        {/* Workspace switcher card */}
        <div className="px-3 pt-3">
          <div className="flex items-center gap-2.5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-neutral-900 text-sm font-semibold text-white">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold leading-tight">{ctx.org.name}</div>
              <div className="truncate text-xs capitalize text-neutral-400">{ctx.org.business_type}</div>
            </div>
          </div>
        </div>

        {/* Nav with active states */}
        <SidebarNav groups={groups} />

        {/* Footer: theme + user + settings */}
        <div className="space-y-2 border-t border-neutral-100 p-3">
          <div className="flex items-center gap-2">
            <div className="flex-1"><ThemeToggle /></div>
          </div>
          <Link href="/dashboard/settings/preferences" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Link>
          <div className="flex items-center gap-2 rounded-lg px-3 py-1.5">
            <span className="truncate text-xs text-neutral-500">{ctx.user.email}</span>
            <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${ROLE_COLORS[ctx.org.role as OrgRole]}`}>
              {ROLE_LABELS[ctx.org.role as OrgRole]}
            </span>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {showTrialBanner && (
          <div className={`flex items-center justify-between gap-4 px-8 py-2.5 text-sm ${
            (ctx.trialDaysLeft ?? 0) <= 2 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"
          }`}>
            <span>
              {(ctx.trialDaysLeft ?? 0) <= 0
                ? "Your free trial ends today."
                : `Your free trial ends in ${ctx.trialDaysLeft} day${ctx.trialDaysLeft === 1 ? "" : "s"}.`}
              {" "}Upgrade to keep your data and access.
            </span>
            <Link href="/locked" className="shrink-0 rounded-md bg-neutral-900 px-3 py-1 text-xs font-semibold text-white hover:bg-neutral-700">
              Upgrade now
            </Link>
          </div>
        )}
        <div className="mx-auto max-w-7xl p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
