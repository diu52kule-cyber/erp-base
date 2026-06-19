-- Phase 24: product barcodes (for POS scanning + printable labels)
alter table products add column if not exists barcode text;
create index if not exists products_barcode_idx on products (org_id, barcode);
