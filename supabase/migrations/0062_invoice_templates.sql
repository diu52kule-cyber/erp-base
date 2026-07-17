-- 0062 — Custom invoice templates + traditional GST layout options
--
-- Lets each org fully control its bill layout: either tweak the built-in
-- template with toggles/labels, or supply a completely custom HTML template.

alter table org_invoice_settings
  add column if not exists use_custom_template  boolean not null default false,
  add column if not exists custom_template_html text,
  add column if not exists invoice_title        text,     -- overrides "TAX INVOICE"
  add column if not exists header_note          text,     -- extra header line(s) e.g. FSSAI no.
  add column if not exists footer_note          text,     -- e.g. cheque-return charges
  add column if not exists show_gst_summary     boolean not null default false, -- tax breakup by rate
  add column if not exists show_signature       boolean not null default true;
