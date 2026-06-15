# ERP Base — Phase 0 Foundation

A modular, multi-tenant business management platform. This is the Phase 0
foundation: authentication, tenant isolation, and the feature-entitlement
engine that lets you sell tailored sets of modules to each customer.

## What works in Phase 0
- Email/password auth (Supabase)
- Multi-tenant model: organizations + memberships, isolated by Postgres RLS
- Feature-entitlement engine: each org sees only the modules it's enabled for
- Dashboard shell with entitlement-gated module navigation
- One example module page (Billing) guarded by its entitlement
- Dockerized (Next.js standalone) for one-push Dokploy deploys

## Tech
Next.js (App Router, TS) · Supabase (Postgres + Auth + RLS) · Tailwind · Docker

---

## 1. Set up Supabase
1. Create a project at supabase.com.
2. Open **SQL Editor**, paste the contents of `supabase/migrations/0001_init.sql`, and Run.
3. Go to **Settings -> API** and copy the Project URL and the `anon` public key.
4. (For easy testing) **Authentication -> Providers -> Email**: turn OFF
   "Confirm email" so signup logs you in immediately.

## 2. Run locally
```bash
cp .env.example .env.local   # paste your Supabase URL + anon key
npm install
npm run dev                  # http://localhost:3000
```
Flow: Sign up -> Onboarding (name + business type) -> Dashboard.

## 3. Put it on a Git host (GitHub alternative)
Pick one — all deploy directly to Dokploy:
- **GitLab.com** (easiest, hosted), or **Codeberg** (hosted Gitea), or self-hosted **Gitea**.

```bash
git init
git add .
git commit -m "Phase 0: foundation"
git branch -M main
git remote add origin <your-repo-ssh-url>
git push -u origin main
```
Keep everything on `main` (no branching, per the plan).

## 4. Deploy on Dokploy
1. In Dokploy: **Create Application**.
2. **Source**: choose your provider (GitLab / Gitea / Bitbucket), authorize, pick this repo, branch `main`.
3. **Build type**: Dockerfile (it's in the repo root).
4. **Environment / Build args** — add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (These are needed at build time because Next bakes public vars in — set them as build args.)
5. Set the port to **3000**, add your domain, deploy.
6. Enable **Auto Deploy** so a push to `main` redeploys automatically.

> Note: make sure the branch configured in Dokploy is `main`, or you'll get a
> "Branch Not Match" error on push.

---

## How the entitlement engine works (this is the part you sell)
- `modules` table = catalog of sellable features.
- `entitlements` table = which modules each org has switched on.
- `src/lib/entitlements.ts` loads the current org's enabled modules.
- The dashboard nav and each module page check that set, so a customer only
  sees and reaches what their plan includes.

To grant a module to a customer today (until the Subscription Manager UI in
Phase 5), insert a row:
```sql
insert into entitlements (org_id, module_key, enabled)
values ('<org-uuid>', 'inventory', true);
```

## Adding a module later (incl. a future education vertical)
1. Add a row to `modules`.
2. Add an entry to `MODULES` in `src/lib/modules.ts`.
3. Create `src/app/dashboard/<module>/page.tsx`, guard it with an entitlement check.
Because the core never hardcodes business-type assumptions, new verticals slot
in without touching the foundation.

## Roadmap
- Phase 1: Billing (invoices, GST) + roles + onboarding polish
- Phase 2: Payments + Inventory
- Phase 3: CRM (business-type variants)
- Phase 4: HR (attendance, payroll)
- Phase 5: Subscription Manager (plan builder, per-customer flags, your billing)
- Phase 6: Data import/migration
- Phase 7: Reporting + polish
