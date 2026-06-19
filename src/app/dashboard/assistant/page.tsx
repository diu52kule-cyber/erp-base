import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/entitlements";
import AssistantClient from "./AssistantClient";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has("assistant") || !ctx.org) redirect("/dashboard");
  return <AssistantClient />;
}
