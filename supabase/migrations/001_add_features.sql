-- Migration 001: Add expenses, recurring invoices, and client portal support
-- Run this in your Supabase SQL editor

-- 1. Add public_token to invoices (for client portal sharing)
alter table invoices add column if not exists public_token uuid default gen_random_uuid() unique;

-- 2. Expenses table
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisations not null,
  description text not null,
  category text not null default 'Other'
    check (category in ('Software','Travel','Office','Marketing','Equipment','Meals','Professional','Other')),
  amount numeric(12,2) not null default 0,
  currency text default 'GBP',
  date date default current_date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table expenses enable row level security;
create policy "Users manage own expenses" on expenses
  for all using (org_id in (select id from organisations where user_id = auth.uid()));

-- 3. Recurring invoices
create table if not exists recurring_invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisations not null,
  client_id uuid references clients,
  title text not null,
  currency text default 'GBP',
  frequency text default 'monthly'
    check (frequency in ('weekly','monthly','quarterly','annually')),
  next_date date not null,
  subtotal numeric(12,2) default 0,
  discount numeric(12,2) default 0,
  tax_rate numeric(5,2) default 0,
  tax_amount numeric(12,2) default 0,
  total numeric(12,2) default 0,
  notes text,
  terms text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists recurring_invoice_items (
  id uuid primary key default gen_random_uuid(),
  recurring_invoice_id uuid references recurring_invoices on delete cascade not null,
  description text not null,
  quantity numeric(10,2) default 1,
  unit_price numeric(12,2) default 0,
  amount numeric(12,2) default 0,
  sort_order integer default 0
);

alter table recurring_invoices enable row level security;
alter table recurring_invoice_items enable row level security;

create policy "Users manage own recurring invoices" on recurring_invoices
  for all using (org_id in (select id from organisations where user_id = auth.uid()));

create policy "Users manage own recurring items" on recurring_invoice_items
  for all using (recurring_invoice_id in (
    select ri.id from recurring_invoices ri
    join organisations o on o.id = ri.org_id
    where o.user_id = auth.uid()
  ));

-- 4. RLS policies for client portal (anon read of shared invoices)
create policy "Portal: read invoice by public_token" on invoices
  for select to anon using (public_token is not null);

create policy "Portal: read invoice items" on invoice_items
  for select to anon
  using (invoice_id in (select id from invoices where public_token is not null));

create policy "Portal: read org for invoice" on organisations
  for select to anon
  using (id in (select org_id from invoices where public_token is not null));

create policy "Portal: read client for invoice" on clients
  for select to anon
  using (id in (
    select client_id from invoices
    where public_token is not null and client_id is not null
  ));

-- 5. Add public_token to quotes (for quote portal sharing)
alter table quotes add column if not exists public_token uuid default gen_random_uuid() unique;

-- RLS policies for quote portal
create policy "Portal: read quote by public_token" on quotes
  for select to anon using (public_token is not null);

create policy "Portal: read quote items" on quote_items
  for select to anon
  using (quote_id in (select id from quotes where public_token is not null));

-- Allow anon to update quote status (for client acceptance via portal)
create policy "Portal: accept quote by token" on quotes
  for update to anon
  using (public_token is not null)
  with check (status = 'accepted');

-- Org/client policies for quote portal (reuse invoice ones — already cover both tables)
-- Note: if invoice portal policies already exist above, quotes share the same org/client tables.
