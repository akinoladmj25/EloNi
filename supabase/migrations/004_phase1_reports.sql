-- Phase 1: UK tax & reports support
alter table organisations add column if not exists business_type text default 'sole_trader' check (business_type in ('sole_trader','limited_company','partnership'));
alter table organisations add column if not exists vat_registered boolean default false;
alter table organisations add column if not exists vat_number text;
alter table organisations add column if not exists vat_scheme text default 'standard' check (vat_scheme in ('standard','flat_rate','cash'));
alter table organisations add column if not exists vat_flat_rate numeric(5,2);

-- Track input VAT on expenses (for VAT-registered businesses)
alter table expenses add column if not exists vat_amount numeric(12,2) default 0;
alter table expenses add column if not exists vat_reclaimable boolean default true;
