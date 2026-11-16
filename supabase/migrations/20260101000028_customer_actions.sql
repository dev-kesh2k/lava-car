-- Ações do cliente e do balcão que não cabem num UPDATE simples com RLS.

-- O cliente cancela o próprio agendamento enquanto o carro ainda não chegou.
create or replace function public.cancel_appointment(p_os uuid)
returns public.appointments_os
language plpgsql
security definer
set search_path = public
as $$
declare
  v_os public.appointments_os;
begin
  update public.appointments_os
     set status = 'CANCELED'
   where id = p_os
     and status = 'SCHEDULED'
     and (customer_id = auth.uid() or (public.is_staff() and tenant_id = public.auth_tenant_id()))
  returning * into v_os;
  if v_os.id is null then
    raise exception 'Agendamento não encontrado ou já em andamento' using errcode = 'P0002';
  end if;
  return v_os;
end;
$$;

-- Usa uma lavagem grátis do cartão fidelidade (balcão).
create or replace function public.redeem_loyalty_reward(p_customer uuid)
returns public.loyalty_cards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card public.loyalty_cards;
begin
  if not public.is_staff() then
    raise exception 'Somente a equipe resgata recompensas' using errcode = '42501';
  end if;
  update public.loyalty_cards
     set rewards_available = rewards_available - 1,
         rewards_redeemed = rewards_redeemed + 1
   where customer_id = p_customer
     and tenant_id = public.auth_tenant_id()
     and rewards_available > 0
  returning * into v_card;
  if v_card.id is null then
    raise exception 'Cliente sem lavagem grátis disponível' using errcode = 'P0002';
  end if;
  return v_card;
end;
$$;

revoke all on function public.cancel_appointment(uuid), public.redeem_loyalty_reward(uuid) from public;
grant execute on function public.cancel_appointment(uuid), public.redeem_loyalty_reward(uuid) to authenticated;
