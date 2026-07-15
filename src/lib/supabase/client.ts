"use client";
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // URL-agnostic: in the browser, talk to Supabase via the SAME origin that
  // served the page (nginx routes /auth/v1 + /rest/v1 to GoTrue/PostgREST).
  // This lets the public URL (e.g. a Cloudflare quick tunnel) change without
  // a rebuild. Falls back to the baked env only during SSR of a client component.
  const url =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return createBrowserClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // Fixed cookie name so browser + server share the session regardless of URL.
    { cookieOptions: { name: "sb-erp-auth" } }
  );
}
