-- Fix: Enable client portal sharing for invoices and quotes
-- Run this once in your Supabase SQL editor (Dashboard → SQL Editor)
-- Safe to run even if partially applied — uses IF NOT EXISTS / exception handlers

-- 1. Add public_token to quotes if missing
alter table quotes add column if not exists public_token text unique;

-- 2. Add public_token to invoices if missing (schema.sql already has it, but just in case)
alter table invoices add column if not exists public_token text unique;

-- 3. Portal RLS policies — wrapped in exception blocks so re-running is safe
do $$ begin
  create policy "Portal: read invoice by public_token" on invoices
    for select to anon using (public_token is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Portal: read invoice items" on invoice_items
    for select to anon using (invoice_id in (select id from invoices where public_token is not null));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Portal: read org for invoice" on organisations
    for select to anon using (id in (select org_id from invoices where public_token is not null));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Portal: read client for invoice" on clients
    for select to anon using (id in (
      select client_id from invoices where public_token is not null and client_id is not null
    ));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Portal: read quote by public_token" on quotes
    for select to anon using (public_token is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Portal: read quote items" on quote_items
    for select to anon using (quote_id in (select id from quotes where public_token is not null));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Portal: accept quote by token" on quotes
    for update to anon
    using (public_token is not null)
    with check (status = 'accepted');
exception when duplicate_object then null; end $$;
