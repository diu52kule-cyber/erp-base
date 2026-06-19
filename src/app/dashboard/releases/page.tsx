import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import ReleasesClient from "./ReleasesClient";

export const dynamic = "force-dynamic";

export default async function ReleasesPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has("releases") || !ctx.org) redirect("/dashboard");

  const supabase = createClient();
  const { data } = await supabase.from("releases")
    .select("id, version, title, notes, status, released_at, created_at")
    .eq("org_id", ctx.org.id).order("created_at", { ascending: false });

  return <ReleasesClient initial={data ?? []} />;
}
