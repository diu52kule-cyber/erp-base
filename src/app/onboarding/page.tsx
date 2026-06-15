"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TYPES = ["cafe", "shop", "mall", "startup", "freelancer", "general"];

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState("general");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function createOrg() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    // Calls the security-definer RPC: makes org + owner membership + default module.
    const { error } = await supabase.rpc("create_organization", {
      p_name: name,
      p_business_type: type,
    });
    setLoading(false);
    if (error) return setError(error.message);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Set up your business</h1>
      <input className="rounded-lg border border-neutral-300 px-3 py-2" placeholder="Business name"
        value={name} onChange={(e) => setName(e.target.value)} />
      <select className="rounded-lg border border-neutral-300 px-3 py-2"
        value={type} onChange={(e) => setType(e.target.value)}>
        {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button onClick={createOrg} disabled={loading || !name}
        className="rounded-lg bg-neutral-900 px-4 py-2.5 text-white disabled:opacity-50">
        {loading ? "..." : "Continue"}
      </button>
    </main>
  );
}
