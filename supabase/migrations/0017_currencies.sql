-- Phase 18: Multi-currency
create table currencies (
  code                text primary key,
  name                text not null,
  symbol              text not null,
  exchange_rate_to_inr numeric(12,4) not null default 1,
  updated_at          timestamptz not null default now()
);

insert into currencies (code, name, symbol, exchange_rate_to_inr) values
  ('INR', 'Indian Rupee',       '₹',    1.0),
  ('USD', 'US Dollar',          '$',    84.0),
  ('EUR', 'Euro',               '€',    91.0),
  ('GBP', 'British Pound',      '£',   107.0),
  ('AED', 'UAE Dirham',         'د.إ',  22.9),
  ('SGD', 'Singapore Dollar',   'S$',   62.5),
  ('AUD', 'Australian Dollar',  'A$',   54.0),
  ('CAD', 'Canadian Dollar',    'C$',   61.5),
  ('JPY', 'Japanese Yen',       '¥',    0.56),
  ('CNY', 'Chinese Yuan',       '¥',    11.6)
on conflict do nothing;

alter table invoices
  add column if not exists currency_code text references currencies(code) default 'INR',
  add column if not exists exchange_rate  numeric(12,4) default 1,
  add column if not exists total_inr      numeric(12,2);

create table org_currency_settings (
  org_id           uuid primary key references organizations(id) on delete cascade,
  default_currency text not null references currencies(code) default 'INR',
  updated_at       timestamptz not null default now()
);
alter table org_currency_settings enable row level security;
create policy "org members" on org_currency_settings for all using (is_org_member(org_id));
