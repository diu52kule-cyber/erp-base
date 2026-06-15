-- Phase 12: File attachments
create table if not exists attachments (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  entity_type  text not null check (entity_type in ('invoice','employee','purchase_order')),
  entity_id    uuid not null,
  file_name    text not null,
  storage_path text not null,
  mime_type    text not null default 'application/octet-stream',
  size_bytes   bigint not null default 0,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);

alter table attachments enable row level security;

create policy "org members manage attachments"
  on attachments for all
  using (is_org_member(org_id));

create index attachments_entity_idx on attachments (org_id, entity_type, entity_id);

-- Note: create a private Supabase Storage bucket named "attachments"
-- with RLS policy: authenticated users whose org_id matches can read/write.
-- Run in Storage dashboard or via CLI:
--   supabase storage create-bucket attachments --private
