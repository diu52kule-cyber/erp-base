import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { getOrgMembers } from "@/lib/orgMembers";
import TasksBoard from "./TasksBoard";

export const dynamic = "force-dynamic";

export default async function TasksPage({ searchParams }: { searchParams: { sprint?: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has("tasks") || !ctx.org) redirect("/dashboard");

  const supabase = createClient();
  const [{ data: tasks }, { data: sprints }, members] = await Promise.all([
    supabase.from("tasks")
      .select("id, title, status, priority, assignee_id, due_date, sprint_id")
      .eq("org_id", ctx.org.id)
      .order("created_at", { ascending: false }),
    supabase.from("sprints").select("id, name, status").eq("org_id", ctx.org.id).order("created_at", { ascending: false }),
    getOrgMembers(ctx.org.id),
  ]);

  return (
    <TasksBoard
      initialTasks={tasks ?? []}
      sprints={sprints ?? []}
      members={members.map((m) => ({ id: m.user_id, name: m.name }))}
      activeSprint={searchParams.sprint ?? null}
    />
  );
}
