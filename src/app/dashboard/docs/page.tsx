import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrgContext } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { DOC_TEMPLATES } from "@/lib/docTemplates";
import NewDocButtons from "./NewDocButtons";

export const dynamic = "force-dynamic";

export default async function DocsPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has("docs") || !ctx.org) redirect("/dashboard");

  const supabase = createClient();
  const { data: docs } = await supabase
    .from("docs")
    .select("id, title, icon, doc_type, status, updated_at, parent_id")
    .eq("org_id", ctx.org.id)
    .order("updated_at", { ascending: false });

  const list = docs ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Docs & Knowledge Base</h1>
        <p className="text-neutral-500 mt-1">Nested pages, templates, and version history for your team.</p>
      </div>

      {/* Templates */}
      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Start from a template</h2>
        <NewDocButtons templates={DOC_TEMPLATES} />
      </div>

      {/* Doc list */}
      <div className="rounded-xl border border-neutral-200 bg-white">
        {list.length === 0 ? (
          <div className="p-10 text-center text-neutral-400 text-sm">No documents yet. Create one from a template above.</div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {list.map((d) => (
              <li key={d.id}>
                <Link href={`/dashboard/docs/${d.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50">
                  <span className="text-lg">{d.icon ?? "📄"}</span>
                  <span className="flex-1 font-medium text-sm">{d.title}</span>
                  {d.status !== "published" && (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 capitalize">{d.status}</span>
                  )}
                  <span className="text-xs text-neutral-400">{new Date(d.updated_at).toLocaleDateString("en-IN")}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
