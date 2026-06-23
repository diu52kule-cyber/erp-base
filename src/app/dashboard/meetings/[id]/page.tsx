import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getOrgContext } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { getOrgMembers } from "@/lib/orgMembers";
import MeetingDetail from "./MeetingDetail";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({ params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has("meetings") || !ctx.org) redirect("/dashboard");

  const supabase = createClient();
  const { data: meeting } = await supabase.from("meetings")
    .select("id, title, meeting_date, agenda, notes, attendees, is_recurring, recurrence_rule").eq("id", params.id).single();
  if (!meeting) notFound();

  const [{ data: items }, members] = await Promise.all([
    supabase.from("action_items").select("id, text, assignee_id, done, task_id").eq("meeting_id", params.id).order("created_at"),
    getOrgMembers(ctx.org.id),
  ]);

  return (
    <div className="space-y-4">
      <Link href="/dashboard/meetings" className="text-xs text-neutral-400 hover:text-neutral-600">← All meetings</Link>
      <MeetingDetail
        meeting={meeting}
        initialItems={items ?? []}
        members={members.map((m) => ({ id: m.user_id, name: m.name }))}
      />
    </div>
  );
}
