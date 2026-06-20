-- Phase 26b: link invoices to a CRM contact so they can post to the party ledger.
alter table invoices add column if not exists customer_id uuid references contacts(id) on delete set null;
create index if not exists invoices_customer_idx on invoices (org_id, customer_id);
