-- 0061 — Invoice→inventory link + bill-format / print settings
--
-- (1) Link invoice line items to inventory products so that selling an item
--     deducts stock (and a credit note / sales-return puts it back).
-- (2) Bill-format + print defaults on the org invoice settings.

-- 1) Product link on invoice line items --------------------------------------
alter table invoice_items
  add column if not exists product_id uuid references products(id) on delete set null;
create index if not exists invoice_items_product_idx on invoice_items(product_id);

-- 2) Bill format + print defaults --------------------------------------------
alter table org_invoice_settings
  add column if not exists template         text    not null default 'classic',
  add column if not exists accent_color     text    not null default '#171717',
  add column if not exists print_color_mode text    not null default 'color',   -- 'color' | 'bw'
  add column if not exists print_copies     integer not null default 1,
  add column if not exists paper_size       text    not null default 'A4',       -- 'A4' | 'A5' | 'thermal_80'
  add column if not exists show_hsn         boolean not null default true,
  add column if not exists show_logo        boolean not null default true;
