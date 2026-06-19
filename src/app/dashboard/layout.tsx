import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/entitlements";
import { MODULES, CATEGORY_LABELS, type ModuleCategory } from "@/lib/modules";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/types/roles";
import type { OrgRole } from "@/lib/types/roles";
import Sidebar from "@/components/Sidebar";

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
  const role = ctx.org.role as OrgRole;

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar
        orgName={ctx.org.name}
        businessType={ctx.org.business_type}
        initial={(ctx.org.name?.[0] ?? "?").toUpperCase()}
        userEmail={ctx.user.email ?? ""}
        roleLabel={ROLE_LABELS[role]}
        roleColor={ROLE_COLORS[role]}
        groups={groups}
      />

      <main className="flex flex-1 flex-col overflow-hidden">
        {showTrialBanner && (
          <div className={`flex shrink-0 items-center justify-between gap-4 px-8 py-2.5 text-sm ${
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
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-6 lg:p-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
