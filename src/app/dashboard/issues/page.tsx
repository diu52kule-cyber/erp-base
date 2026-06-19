import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { getOrgMembers } from "@/lib/orgMembers";
import IssuesClient from "./IssuesClient";

export const dynamic = "force-dynamic";

export default async function IssuesPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has("issues") || !ctx.org) redirect("/dashboard");

  const supabase = createClient();
  const [{ data: issues }, members] = await Promise.all([
    supabase.from("issues").select("id, title, severity, status, module, assignee_id, created_at")
      .eq("org_id", ctx.org.id).order("created_at", { ascending: false }),
    getOrgMembers(ctx.org.id),
  ]);

  return <IssuesClient initial={issues ?? []} members={members.map((m) => ({ id: m.user_id, name: m.name }))} />;
}
