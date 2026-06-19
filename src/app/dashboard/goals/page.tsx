import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import GoalsClient from "./GoalsClient";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has("goals") || !ctx.org) redirect("/dashboard");

  const supabase = createClient();
  const [{ data: goals }, { data: krs }] = await Promise.all([
    supabase.from("goals").select("id, title, description, level, quarter, progress, status")
      .eq("org_id", ctx.org.id).order("created_at", { ascending: false }),
    supabase.from("key_results").select("id, goal_id, title, target, current, unit").eq("org_id", ctx.org.id),
  ]);

  return <GoalsClient initialGoals={goals ?? []} initialKRs={krs ?? []} />;
}
