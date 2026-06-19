import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getOrgContext } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import DocEditor from "./DocEditor";

export const dynamic = "force-dynamic";

export default async function DocDetailPage({ params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has("docs") || !ctx.org) redirect("/dashboard");

  const supabase = createClient();
  const { data: doc } = await supabase
    .from("docs")
    .select("id, title, content, icon, status, updated_at")
    .eq("id", params.id)
    .single();
  if (!doc) notFound();

  const { data: versions } = await supabase
    .from("doc_versions")
    .select("id, title, created_at")
    .eq("doc_id", params.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-4">
      <Link href="/dashboard/docs" className="text-xs text-neutral-400 hover:text-neutral-600">← All docs</Link>
      <DocEditor doc={doc} versions={versions ?? []} />
    </div>
  );
}
