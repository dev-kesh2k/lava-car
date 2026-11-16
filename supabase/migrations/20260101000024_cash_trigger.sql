-- Financeiro: OS paga gera a entrada no fluxo de caixa automaticamente; estorno remove a entrada.
create or replace function public.os_payment_cash()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tz text;
begin
  if new.payment_status is not distinct from old.payment_status then
    return new;
  end if;

  if new.payment_status = 'PAID' then
    select timezone into v_tz from public.tenants where id = new.tenant_id;
    insert into public.cash_entries (tenant_id, type, category, description, amount, occurred_on, os_id)
    values (
      new.tenant_id,
      'INCOME',
      'Serviços',
      format('OS %s', new.number),
      new.total_amount,
      (coalesce(new.paid_at, now()) at time zone v_tz)::date,
      new.id
    )
    on conflict (os_id) do nothing;
  elsif old.payment_status = 'PAID' then
    delete from public.cash_entries where os_id = new.id and type = 'INCOME';
  end if;
  return new;
end;
$$;

-- paid_at precisa estar preenchido antes do AFTER: o BEFORE abaixo cuida disso.
create or replace function public.os_set_paid_at()
returns trigger
language plpgsql
as $$
begin
  if new.payment_status = 'PAID' and old.payment_status is distinct from 'PAID' then
    new.paid_at := coalesce(new.paid_at, now());
  elsif new.payment_status <> 'PAID' then
    new.paid_at := null;
  end if;
  return new;
end;
$$;

create trigger appointments_os_paid_at before update of payment_status on public.appointments_os
  for each row execute function public.os_set_paid_at();

create trigger appointments_os_cash after update of payment_status on public.appointments_os
  for each row execute function public.os_payment_cash();
