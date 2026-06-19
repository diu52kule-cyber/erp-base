import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import DecisionsClient from "./DecisionsClient";

export const dynamic = "force-dynamic";

export default async function DecisionsPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has("decisions") || !ctx.org) redirect("/dashboard");

  const supabase = createClient();
  const { data } = await supabase.from("decisions")
    .select("id, title, context, decision, alternatives, decided_on")
    .eq("org_id", ctx.org.id).order("decided_on", { ascending: false });

  return <DecisionsClient initial={data ?? []} />;
}
