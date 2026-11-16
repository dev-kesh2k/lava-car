-- Fidelidade: cada lavagem concluída (status Pronto pela primeira vez) carimba um selo no cartão do cliente.
-- Ao completar a meta da loja, os selos zeram e o cliente ganha uma lavagem grátis.
create or replace function public.os_loyalty_stamp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_goal smallint;
begin
  if new.customer_id is null
     or new.status not in ('READY', 'DELIVERED')
     or old.status in ('READY', 'DELIVERED') then
    return new;
  end if;

  select loyalty_goal into v_goal from public.tenants where id = new.tenant_id;

  insert into public.loyalty_cards as c (tenant_id, customer_id, stamps, total_washes)
  values (new.tenant_id, new.customer_id, 1, 1)
  on conflict (tenant_id, customer_id) do update
    set stamps = c.stamps + 1,
        total_washes = c.total_washes + 1;

  update public.loyalty_cards
     set stamps = stamps - v_goal,
         rewards_available = rewards_available + 1
   where tenant_id = new.tenant_id and customer_id = new.customer_id and stamps >= v_goal;

  return new;
end;
$$;

create trigger appointments_os_loyalty after update of status on public.appointments_os
  for each row execute function public.os_loyalty_stamp();
