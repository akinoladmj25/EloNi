-- Users are managed by Supabase Auth

-- Organisations (one per user for now, multi-team later)
create table organisations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  email text,
  phone text,
  address text,
  city text,
  state text,
  postcode text,
  country text,
  website text,
  logo_url text,
  default_currency text default 'GBP',
  invoice_prefix text default 'INV',
  invoice_next_number integer default 1000,
  quote_prefix text default 'QUO',
  quote_next_number integer default 1000,
  tax_name text default 'VAT',
  created_at timestamptz default now()
);

-- Clients
create table clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisations not null,
  name text not null,
  company text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  postcode text,
  country text,
  created_at timestamptz default now()
);

-- Invoices
create table invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisations not null,
  client_id uuid references clients,
  invoice_number text not null,
  status text default 'draft' check (status in ('draft','sent','paid','overdue','cancelled')),
  currency text default 'GBP',
  issue_date date default current_date,
  due_date date,
  subtotal numeric(12,2) default 0,
  discount numeric(12,2) default 0,
  tax_rate numeric(5,2) default 0,
  tax_amount numeric(12,2) default 0,
  total numeric(12,2) default 0,
  notes text,
  terms text,
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Invoice line items
create table invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references invoices on delete cascade not null,
  description text not null,
  quantity numeric(10,2) default 1,
  unit_price numeric(12,2) default 0,
  amount numeric(12,2) default 0,
  sort_order integer default 0
);

-- Row Level Security
alter table organisations enable row level security;
alter table clients enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;

create policy "Users manage own org" on organisations for all using (user_id = auth.uid());
create policy "Users manage own clients" on clients for all using (org_id in (select id from organisations where user_id = auth.uid()));
create policy "Users manage own invoices" on invoices for all using (org_id in (select id from organisations where user_id = auth.uid()));
create policy "Users manage own items" on invoice_items for all using (invoice_id in (select i.id from invoices i join organisations o on o.id = i.org_id where o.user_id = auth.uid()));

-- Quotes
create table quotes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisations not null,
  client_id uuid references clients,
  quote_number text not null,
  status text default 'draft' check (status in ('draft','sent','accepted','declined','expired')),
  currency text default 'GBP',
  issue_date date default current_date,
  expiry_date date,
  subtotal numeric(12,2) default 0,
  discount numeric(12,2) default 0,
  tax_rate numeric(5,2) default 0,
  tax_amount numeric(12,2) default 0,
  total numeric(12,2) default 0,
  notes text,
  terms text,
  sent_at timestamptz,
  accepted_at timestamptz,
  converted_invoice_id uuid references invoices,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Quote line items
create table quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references quotes on delete cascade not null,
  description text not null,
  quantity numeric(10,2) default 1,
  unit_price numeric(12,2) default 0,
  amount numeric(12,2) default 0,
  sort_order integer default 0
);

alter table quotes enable row level security;
alter table quote_items enable row level security;

create policy "Users manage own quotes" on quotes for all using (org_id in (select id from organisations where user_id = auth.uid()));
create policy "Users manage own quote items" on quote_items for all using (quote_id in (select q.id from quotes q join organisations o on o.id = q.org_id where o.user_id = auth.uid()));
