-- 1. Track when client views a shared invoice
alter table invoices add column if not exists client_viewed_at timestamptz;

-- 2. Receipt attachment on expenses
alter table expenses add column if not exists receipt_url text;

-- 3. Allow anon to mark invoice as viewed via portal
do $$ begin
  create policy "Portal: mark invoice viewed" on invoices
    for update to anon
    using (public_token is not null)
    with check (true);
exception when duplicate_object then null; end $$;

-- 4. Supabase Storage bucket for expense receipts
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

-- Storage RLS
do $$ begin
  create policy "Users upload own receipts" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'receipts');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users read own receipts" on storage.objects
    for select to authenticated
    using (bucket_id = 'receipts');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users delete own receipts" on storage.objects
    for delete to authenticated
    using (bucket_id = 'receipts');
exception when duplicate_object then null; end $$;

-- 5. SECURITY DEFINER function: auto-generate due recurring invoices (bypasses RLS for cron)
create or replace function generate_due_recurring_invoices()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  org_data record;
  inv_id uuid;
  inv_number text;
  advance_date date;
  generated_count int := 0;
begin
  for rec in
    select * from recurring_invoices
    where active = true and next_date <= current_date
    order by next_date asc
  loop
    select invoice_prefix, invoice_next_number
    into org_data
    from organisations where id = rec.org_id;

    if org_data is null then continue; end if;

    inv_number := org_data.invoice_prefix || '-' || org_data.invoice_next_number::text;

    insert into invoices (
      org_id, client_id, invoice_number, status, currency,
      issue_date, subtotal, discount, tax_rate, tax_amount, total, notes, terms
    )
    values (
      rec.org_id, rec.client_id, inv_number, 'draft', rec.currency,
      current_date, rec.subtotal, rec.discount, rec.tax_rate, rec.tax_amount,
      rec.total, rec.notes, rec.terms
    )
    returning id into inv_id;

    insert into invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
    select inv_id, description, quantity, unit_price, amount, sort_order
    from recurring_invoice_items
    where recurring_invoice_id = rec.id;

    update organisations
    set invoice_next_number = invoice_next_number + 1
    where id = rec.org_id;

    advance_date := case rec.frequency
      when 'weekly'    then rec.next_date + interval '7 days'
      when 'monthly'   then (rec.next_date::timestamp + interval '1 month')::date
      when 'quarterly' then (rec.next_date::timestamp + interval '3 months')::date
      when 'annually'  then (rec.next_date::timestamp + interval '1 year')::date
      else (rec.next_date::timestamp + interval '1 month')::date
    end;

    update recurring_invoices
    set next_date = advance_date, updated_at = now()
    where id = rec.id;

    generated_count := generated_count + 1;
  end loop;

  return json_build_object('generated', generated_count);
end;
$$;

grant execute on function generate_due_recurring_invoices() to anon, authenticated;

-- 6. SECURITY DEFINER function: get overdue invoices for reminders cron (bypasses RLS)
create or replace function get_overdue_invoices_for_reminders()
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  return (
    select coalesce(json_agg(row_to_json(t)), '[]'::json)
    from (
      select
        i.id,
        i.invoice_number,
        i.total,
        i.currency,
        i.due_date,
        json_build_object('name', c.name, 'email', c.email) as client,
        json_build_object('name', o.name, 'email', o.email) as org
      from invoices i
      left join clients c on c.id = i.client_id
      left join organisations o on o.id = i.org_id
      where i.status = 'overdue'
        and c.id is not null
        and c.email is not null
        and i.due_date is not null
    ) t
  );
end;
$$;

grant execute on function get_overdue_invoices_for_reminders() to anon;
