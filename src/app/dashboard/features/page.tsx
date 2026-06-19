import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import FeaturesBoard from "./FeaturesBoard";

export const dynamic = "force-dynamic";

export default async function FeaturesPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has("features") || !ctx.org) redirect("/dashboard");

  const supabase = createClient();
  const { data } = await supabase.from("features")
    .select("id, title, description, stage").eq("org_id", ctx.org.id).order("created_at", { ascending: false });

  return <FeaturesBoard initial={data ?? []} />;
}
