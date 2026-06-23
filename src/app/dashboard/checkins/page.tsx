import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { getOrgMembers } from "@/lib/orgMembers";
import CheckinsClient from "./CheckinsClient";

export const dynamic = "force-dynamic";

export default async function CheckinsPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has("checkins") || !ctx.org) redirect("/dashboard");

  const today = new Date().toISOString().split("T")[0];
  const supabase = createClient();
  const [{ data: todays }, { data: mine }, members] = await Promise.all([
    supabase.from("checkins").select("user_id, yesterday, today, blockers, mood, created_at")
      .eq("org_id", ctx.org.id).eq("checkin_date", today),
    supabase.from("checkins").select("yesterday, today, blockers, mood")
      .eq("org_id", ctx.org.id).eq("user_id", ctx.user.id).eq("checkin_date", today).maybeSingle(),
    getOrgMembers(ctx.org.id),
  ]);

  const nameMap = Object.fromEntries(members.map((m) => [m.user_id, m.name]));
  const feed = (todays ?? []).map((c) => ({ ...c, name: nameMap[c.user_id] ?? "member" }));
  const checkedInCount = feed.length;

  return (
    <CheckinsClient
      mine={mine ?? null}
      feed={feed}
      checkedIn={checkedInCount}
      teamSize={members.length}
    />
  );
}
