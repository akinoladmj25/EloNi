-- Phase 3: VAT return tracking + HMRC MTD connection

-- VAT returns audit log
create table if not exists vat_returns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisations(id) on delete cascade not null,

  period_from date not null,
  period_to date not null,

  -- 9-box snapshot at time of saving
  box1 numeric(12,2) default 0,
  box2 numeric(12,2) default 0,
  box3 numeric(12,2) default 0,
  box4 numeric(12,2) default 0,
  box5 numeric(12,2) default 0,
  box6 numeric(12,2) default 0,
  box7 numeric(12,2) default 0,
  box8 numeric(12,2) default 0,
  box9 numeric(12,2) default 0,

  status text default 'draft' check (status in ('draft', 'submitted', 'paid')),
  submission_method text check (submission_method in ('manual', 'hmrc_mtd')),

  -- HMRC MTD response fields (filled when submitted via API)
  hmrc_processing_date timestamptz,
  hmrc_form_bundle_number text,
  hmrc_charge_ref_number text,
  hmrc_payment_indicator text,

  submitted_at timestamptz,
  paid_at timestamptz,
  notes text,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(org_id, period_from, period_to)
);

alter table vat_returns enable row level security;

do $$ begin
  create policy "Users manage own VAT returns" on vat_returns
    for all to authenticated
    using (org_id in (select id from organisations where user_id = auth.uid()))
    with check (org_id in (select id from organisations where user_id = auth.uid()));
exception when duplicate_object then null; end $$;

create index if not exists idx_vat_returns_org_period on vat_returns(org_id, period_from desc);

-- HMRC OAuth connection (one per org)
create table if not exists hmrc_connections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisations(id) on delete cascade not null unique,

  vat_number text not null,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  scope text,

  connected_at timestamptz default now(),
  last_used_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table hmrc_connections enable row level security;

do $$ begin
  create policy "Users manage own HMRC connection" on hmrc_connections
    for all to authenticated
    using (org_id in (select id from organisations where user_id = auth.uid()))
    with check (org_id in (select id from organisations where user_id = auth.uid()));
exception when duplicate_object then null; end $$;
