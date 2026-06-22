-- Phase 39: Soft-delete (archive) support
-- archived_at being set = archived; null = active

alter table contacts  add column if not exists archived_at timestamptz;
alter table products  add column if not exists archived_at timestamptz;
alter table deals     add column if not exists archived_at timestamptz;

create index if not exists contacts_active_idx on contacts (org_id) where archived_at is null;
create index if not exists products_active_idx on products (org_id) where archived_at is null;
create index if not exists deals_active_idx    on deals    (org_id) where archived_at is null;
