import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { ALL_MODULE_KEYS } from "@/lib/modules";

export type PlanInfo = {
  plan_name: string;
  status: string; // trial | active | suspended | cancelled
  amount: number;
  billing_period: string; // monthly | yearly
  next_billing_date: string | null;
};

export type AccessState = "active" | "trial" | "locked";

export type OrgContext = {
  user: { id: string; email?: string };
  org: { id: string; role: string; name: string; business_type: string } | null;
  enabledModules: Set<string>;
  plan: PlanInfo;
  access: AccessState;
  trialDaysLeft: number | null;
};

function computeAccess(plan: PlanInfo): { access: AccessState; trialDaysLeft: number | null } {
  if (plan.status === "active") return { access: "active", trialDaysLeft: null };

  if (plan.status === "trial") {
    if (!plan.next_billing_date) return { access: "trial", trialDaysLeft: null };
    const end = new Date(plan.next_billing_date + "T23:59:59");
    const now = new Date();
    const msLeft = end.getTime() - now.getTime();
    if (msLeft < 0) return { access: "locked", trialDaysLeft: 0 };
    return { access: "trial", trialDaysLeft: Math.ceil(msLeft / (24 * 60 * 60 * 1000)) };
  }

  // suspended | cancelled | anything else
  return { access: "locked", trialDaysLeft: null };
}

// Returns the current user's org, enabled modules, plan, and computed access state.
// Wrapped in React cache() so multiple calls within one request render hit the DB once.
export const getOrgContext = cache(async (): Promise<OrgContext | null> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("memberships")
    .select("org_id, role, organizations(name, business_type)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const defaultPlan: PlanInfo = {
    plan_name: "trial", status: "trial", amount: 0, billing_period: "monthly", next_billing_date: null,
  };

  if (!membership) {
    return {
      user, org: null, enabledModules: new Set<string>(),
      plan: defaultPlan, access: "trial", trialDaysLeft: null,
    };
  }

  const orgId = membership.org_id as string;

  const [{ data: entRows }, { data: planRow }] = await Promise.all([
    supabase.from("entitlements").select("module_key, enabled").eq("org_id", orgId).eq("enabled", true),
    supabase.from("org_plans").select("plan_name, status, amount, billing_period, next_billing_date").eq("org_id", orgId).maybeSingle(),
  ]);

  // If no entitlement rows exist for this org, fall back to all modules (back-compat).
  const enabledModules = entRows && entRows.length > 0
    ? new Set(entRows.map((r) => r.module_key as string))
    : new Set(ALL_MODULE_KEYS);

  const plan: PlanInfo = planRow
    ? {
        plan_name: planRow.plan_name as string,
        status: planRow.status as string,
        amount: Number(planRow.amount ?? 0),
        billing_period: planRow.billing_period as string,
        next_billing_date: (planRow.next_billing_date as string | null) ?? null,
      }
    : defaultPlan;

  const { access, trialDaysLeft } = computeAccess(plan);

  return {
    user,
    org: {
      id: orgId,
      role: membership.role as string,
      // @ts-expect-error supabase nested select typing
      name: membership.organizations?.name as string,
      // @ts-expect-error supabase nested select typing
      business_type: membership.organizations?.business_type as string,
    },
    enabledModules,
    plan,
    access,
    trialDaysLeft,
  };
});
