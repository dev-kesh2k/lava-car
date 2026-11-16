-- Abertura rápida de OS no balcão (cliente avulso): placa + porte + serviço e o carro entra direto na fila.
create or replace function public.open_walk_in(
  p_plate text,
  p_category public.vehicle_category,
  p_service uuid,
  p_addons uuid[] default '{}',
  p_model text default '',
  p_color text default '',
  p_customer_name text default '',
  p_customer_phone text default null
)
returns public.appointments_os
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me public.profiles;
  v_plate text := upper(regexp_replace(coalesce(p_plate, ''), '[^A-Za-z0-9]', '', 'g'));
  v_vehicle public.vehicles;
  v_total numeric(10, 2);
  v_duration integer;
  v_customer public.profiles;
  v_os public.appointments_os;
begin
  select * into v_me from public.profiles where id = auth.uid() and active and role in ('ADMIN', 'OPERATOR');
  if v_me.id is null then
    raise exception 'Somente a equipe da loja abre OS no balcão' using errcode = '42501';
  end if;

  insert into public.vehicles as v (tenant_id, plate, model, color, category)
  values (v_me.tenant_id, v_plate, coalesce(p_model, ''), coalesce(p_color, ''), p_category)
  on conflict (tenant_id, plate) do update
    set category = excluded.category,
        model = coalesce(nullif(excluded.model, ''), v.model),
        color = coalesce(nullif(excluded.color, ''), v.color)
  returning * into v_vehicle;

  if v_vehicle.owner_id is not null then
    select * into v_customer from public.profiles where id = v_vehicle.owner_id;
  end if;

  select sum(sp.price), sum(s.duration_min)
    into v_total, v_duration
    from public.services s
    join public.service_prices sp on sp.service_id = s.id and sp.category = p_category
   where s.tenant_id = v_me.tenant_id and s.active
     and (s.id = p_service or s.id = any (coalesce(p_addons, '{}')));
  if v_duration is null then
    raise exception 'Serviço sem preço para este porte' using errcode = '22023';
  end if;

  insert into public.appointments_os (
    tenant_id, origin, customer_id, customer_name, customer_phone, vehicle_id, service_id, employee_id,
    scheduled_at, duration_min, ends_at, status, total_amount
  ) values (
    v_me.tenant_id, 'WALK_IN', v_customer.id,
    coalesce(nullif(trim(p_customer_name), ''), v_customer.full_name, ''),
    coalesce(nullif(trim(p_customer_phone), ''), v_customer.phone),
    v_vehicle.id, p_service, case when v_me.role = 'OPERATOR' then v_me.id end,
    now(), v_duration, now() + make_interval(mins => v_duration), 'WAITING', v_total
  ) returning * into v_os;

  insert into public.os_items (os_id, tenant_id, service_id, kind, name, price, duration_min)
  select v_os.id, v_me.tenant_id, s.id, s.kind, s.name, sp.price, s.duration_min
    from public.services s
    join public.service_prices sp on sp.service_id = s.id and sp.category = p_category
   where s.tenant_id = v_me.tenant_id and s.active
     and (s.id = p_service or s.id = any (coalesce(p_addons, '{}')));

  return v_os;
end;
$$;

revoke all on function public.open_walk_in(text, public.vehicle_category, uuid, uuid[], text, text, text, text) from public;
grant execute on function public.open_walk_in(text, public.vehicle_category, uuid, uuid[], text, text, text, text) to authenticated;
