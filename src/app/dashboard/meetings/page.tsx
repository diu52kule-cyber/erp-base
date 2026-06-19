import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrgContext } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import NewMeeting from "./NewMeeting";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has("meetings") || !ctx.org) redirect("/dashboard");

  const supabase = createClient();
  const { data: meetings } = await supabase.from("meetings")
    .select("id, title, meeting_date").eq("org_id", ctx.org.id).order("meeting_date", { ascending: false });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Meetings</h1>
          <p className="text-neutral-500 mt-1 text-sm">Agenda, notes, and action items that turn into tasks.</p>
        </div>
        <NewMeeting />
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white">
        {(meetings ?? []).length === 0 ? <div className="p-10 text-center text-sm text-neutral-400">No meetings logged yet.</div> : (
          <ul className="divide-y divide-neutral-100">
            {(meetings ?? []).map((m) => (
              <li key={m.id}>
                <Link href={`/dashboard/meetings/${m.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50">
                  <span className="text-lg">📝</span>
                  <span className="flex-1 font-medium text-sm">{m.title}</span>
                  <span className="text-xs text-neutral-400">{new Date(m.meeting_date).toLocaleDateString("en-IN")}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
