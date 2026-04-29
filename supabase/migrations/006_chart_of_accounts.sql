-- Phase 4: Chart of Accounts + Balance Sheet foundation

create table if not exists chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisations(id) on delete cascade not null,
  code text not null,
  name text not null,
  type text not null check (type in ('asset', 'liability', 'equity', 'income', 'expense')),
  subtype text,  -- current_asset / fixed_asset / current_liability / long_term / cogs etc.
  parent_id uuid references chart_of_accounts(id),
  is_system boolean default false,
  is_active boolean default true,
  description text,
  opening_balance numeric(12,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(org_id, code)
);

create index if not exists idx_coa_org_type on chart_of_accounts(org_id, type, code);

alter table chart_of_accounts enable row level security;

do $$ begin
  create policy "Users manage own CoA" on chart_of_accounts
    for all to authenticated
    using (org_id in (select id from organisations where user_id = auth.uid()))
    with check (org_id in (select id from organisations where user_id = auth.uid()));
exception when duplicate_object then null; end $$;

-- Opening balance date on org (the date from which we start tracking — anything before is 'opening')
alter table organisations add column if not exists opening_balance_date date;

-- Seeder: standard UK chart of accounts. Idempotent — no-op if already seeded.
create or replace function seed_chart_of_accounts(p_org_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count int := 0;
begin
  if exists(select 1 from chart_of_accounts where org_id = p_org_id) then
    return 0;
  end if;

  insert into chart_of_accounts (org_id, code, name, type, subtype, is_system) values
    -- Assets
    (p_org_id, '1000', 'Bank Account',                  'asset',     'current_asset',     true),
    (p_org_id, '1010', 'Cash on Hand',                  'asset',     'current_asset',     false),
    (p_org_id, '1100', 'Trade Receivables',             'asset',     'current_asset',     true),
    (p_org_id, '1200', 'Inventory',                     'asset',     'current_asset',     false),
    (p_org_id, '1300', 'VAT Reclaimable',               'asset',     'current_asset',     true),
    (p_org_id, '1400', 'Prepayments',                   'asset',     'current_asset',     false),
    (p_org_id, '1500', 'Equipment & Computers',         'asset',     'fixed_asset',       true),
    (p_org_id, '1600', 'Vehicles',                      'asset',     'fixed_asset',       false),
    (p_org_id, '1700', 'Property',                      'asset',     'fixed_asset',       false),
    (p_org_id, '1800', 'Accumulated Depreciation',      'asset',     'contra_asset',      false),
    -- Liabilities
    (p_org_id, '2000', 'Trade Payables',                'liability', 'current_liability', true),
    (p_org_id, '2100', 'VAT Payable',                   'liability', 'current_liability', true),
    (p_org_id, '2200', 'PAYE / NI Payable',             'liability', 'current_liability', false),
    (p_org_id, '2300', 'Corporation Tax Payable',       'liability', 'current_liability', false),
    (p_org_id, '2400', 'Self-Assessment Payable',       'liability', 'current_liability', false),
    (p_org_id, '2500', 'Credit Card',                   'liability', 'current_liability', false),
    (p_org_id, '2600', 'Bank Loan',                     'liability', 'long_term',         false),
    (p_org_id, '2700', 'Director''s Loan',              'liability', 'long_term',         false),
    -- Equity
    (p_org_id, '3000', 'Owner''s Capital / Share Capital', 'equity', null,                true),
    (p_org_id, '3100', 'Drawings / Dividends',          'equity',    null,                true),
    (p_org_id, '3200', 'Retained Earnings',             'equity',    null,                true),
    -- Income
    (p_org_id, '4000', 'Sales Income',                  'income',    null,                true),
    (p_org_id, '4100', 'Other Income',                  'income',    null,                false),
    (p_org_id, '4200', 'Interest Income',               'income',    null,                false),
    -- Expenses (mapped to expense categories)
    (p_org_id, '5000', 'Cost of Sales',                 'expense',   'cogs',              false),
    (p_org_id, '6000', 'Software & Subscriptions',      'expense',   'operating',         true),
    (p_org_id, '6100', 'Travel',                        'expense',   'operating',         true),
    (p_org_id, '6200', 'Office',                        'expense',   'operating',         true),
    (p_org_id, '6300', 'Marketing',                     'expense',   'operating',         true),
    (p_org_id, '6400', 'Equipment',                     'expense',   'operating',         true),
    (p_org_id, '6500', 'Meals & Entertainment',         'expense',   'operating',         true),
    (p_org_id, '6600', 'Professional Fees',             'expense',   'operating',         true),
    (p_org_id, '6700', 'Bank & Finance Charges',        'expense',   'operating',         false),
    (p_org_id, '9000', 'Other Expenses',                'expense',   'operating',         true);

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

grant execute on function seed_chart_of_accounts(uuid) to authenticated;

-- Backfill: seed CoA for any existing org that doesn't have one
do $$
declare
  org_record record;
begin
  for org_record in select id from organisations
  loop
    perform seed_chart_of_accounts(org_record.id);
  end loop;
end $$;
