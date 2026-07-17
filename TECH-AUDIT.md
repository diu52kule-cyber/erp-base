# Gradia ERP — Technical / Security / Ops Audit (2026-07-18)

Complements `AUDIT.md` (product/feature-gap audit). Scope here: security, data
integrity, infrastructure/ops, correctness of recent features, SEO.

Environment: production instance at `erp.gradia.solutions` (self-hosted lean
Supabase on the laptop server) + `gradia.solutions` (Cloudflare Worker
coming-soon site).

Snapshot (verified on the DB): 109 public tables · RLS on 106 · 3 orgs / 3 users
/ 2 invoices / 2 products / 1 payment (early stage). Host: 3.7 GB RAM (2.6 GB
free), 830 GB disk free.

Severity: 🔴 high · 🟠 medium · 🟡 low · ✅ good.

---

## 1. Security

- ✅ **RLS broadly enforced.** 106/109 public tables have RLS, and the role-based
  hardening (`0026_rls_by_role.sql`, `has_module_access()`) **is applied** — per-role
  write gating, not just "org member".
- ✅ **Service-role key not leaked.** `.env.example` keeps it commented with a warning.
- ✅ **New `offers` table** ships with full `is_org_member` RLS policies.
- 🟠 **`org_plans` has no RLS** (tenant-scoped plan/entitlement). Read today only via
  the service-role admin client (bypasses RLS), so no known live exposure — but a
  future authenticated/anon read path could leak plans across orgs. **Fix:** enable
  RLS + `is_org_member(org_id)` select policy.
- 🟡 **`rate_limits` has no RLS** (server-only login throttle). Acceptable; add a
  deny-all policy for defense-in-depth.
- ✅ **`currencies` no RLS — fine** (global read-only reference).
- 🔴 **SSH exposed with weak password `112211`.** `ssh.gradia.solutions` is reachable
  from anywhere with password auth on a trivial password — the single highest risk to
  the whole server. **Fix:** Cloudflare Access gate **or** install a key +
  `PasswordAuthentication no`. (Deferred by request.)
- 🟠 **AI Assistant unmetered.** If `ANTHROPIC_API_KEY` is set, `/api/assistant` has no
  per-org token cap — cost/abuse risk. Add an `ai_usage` cap + paid-tier gate.
- 🟠 **Invite links are bearer** (no email-match). Add "logged-in email == invited
  email" if invites should be recipient-locked.
- 🟡 **Custom invoice templates render org HTML** (`dangerouslySetInnerHTML`). Mitigated:
  values HTML-escaped; `<script>`/`on*=`/`javascript:`/iframe stripped. Self-XSS within
  the org only. Fine now; stricter sanitizer if templates ever become shareable.
- 🟡 **Admin secrets unverifiable from here** — ensure `ADMIN_PASSWORD` strong,
  `ADMIN_SECRET` 64-hex random (rate-limit + timing-safe compare already in place).

## 2. Infrastructure & operations

- 🟠 **Single-host SPOF.** One laptop, home network, Cloudflare tunnel. Self-heal
  (systemd + restart policies + lid-ignore) is configured and proven, but no
  redundancy. Fine for pilot; not for scale.
- 🟠 **Backups: infra present, verification needed.** `org_backup_settings` +
  `backup_history` exist (0058). **Action:** confirm schedule enabled, a recent run
  succeeded, and a **restore has been tested**. Untested backup ≠ backup.
- 🟡 **Low RAM → ~9-min builds.** Runtime healthy (2.6 GB free); build-time only.
- 🟡 **No staging.** Straight-to-prod rebuilds; mitigated by the `tsc` gate + git. A
  staging compose project would de-risk bigger changes.
- ✅ **Disk ample** (830 GB free).
- 🟡 **Post-migration reload gotcha:** self-hosted PostgREST caches schema — every
  column-adding migration must be followed by `docker compose restart rest` /
  `NOTIFY pgrst` or the app throws "column not in schema cache". (Now part of the
  deploy routine.)

## 3. Correctness (recent features reviewed)

- ✅ **Invoice → inventory**: deducts on sale; restores on credit-note/void/delete;
  re-syncs on edit. An edit bug (line items losing `product_id` → stock drift) was
  found **and fixed** this session.
- ✅ **Multi-source split payments**: one payment + ledger entry per split, capped at
  total, status paid/partial/draft from total received.
- ✅ **Barcode scan / Code128 labels**: picker matches barcode/SKU + auto-picks on
  exact match; labels now have proper Code128 quiet zones.
- ✅ **PO receive** updates stock **and** cost price.
- 🟡 **Contact↔invoice link on the contact page uses `ilike customer_name`** (fuzzy),
  not `customer_id`. Can mis-match duplicate names — prefer `customer_id`.
- 🟡 **Stock can go negative** on oversell (backorder allowed by design) — surface in
  reports if undesired.

## 4. SEO (added this session)

- ✅ App: `app/sitemap.ts` (public pages only) · `app/robots.ts` (disallows
  dashboard/admin/api/auth/per-tenant) · keyword-rich title/description/`keywords[]` ·
  canonical · OG/Twitter.
- ✅ Coming-soon: Worker serves real `robots.txt` + `sitemap.xml`; page has
  keywords/canonical/OG.
- ✅ Effective `robots.txt` allows search engines, blocks AI-training bots
  (GPTBot/ClaudeBot/CCBot/Google-Extended), declares the sitemap.
- ▶️ **Owner step:** add both domains to **Google Search Console** and submit
  `https://gradia.solutions/sitemap.xml` + `https://erp.gradia.solutions/sitemap.xml`.

---

## Prioritized actions

1. 🔴 **Secure SSH** — Access gate or key-only on `ssh.gradia.solutions`.
2. 🟠 **RLS on `org_plans`** (+ deny-all on `rate_limits`).
3. 🟠 **Verify & test backups** (schedule on, restore rehearsed).
4. 🟠 **Meter AI assistant**; **lock invites** to email.
5. 🟢 **SEO:** submit sitemaps to Google Search Console.
6. 🟡 Contact→invoice join on `customer_id`; consider a staging compose project.

Nothing here blocks current use; items 1–3 should precede onboarding real
customers with real data.
