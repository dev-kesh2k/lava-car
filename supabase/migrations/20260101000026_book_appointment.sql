-- Agendamento pelo app. Tudo é validado no banco (o cliente não escolhe preço nem fura a capacidade):
-- veículo do próprio cliente, serviços ativos da loja, preço pelo porte, horário de funcionamento e boxes livres.
create or replace function public.book_appointment(
  p_vehicle uuid,
  p_service uuid,
  p_addons uuid[] default '{}',
  p_scheduled_at timestamptz default null,
  p_payment public.payment_method default 'ON_SITE',
  p_notes text default null
)
returns public.appointments_os
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me public.profiles;
  v_tenant public.tenants;
  v_vehicle public.vehicles;
  v_total numeric(10, 2);
  v_duration integer;
  v_count integer;
  v_local timestamp;
  v_hours jsonb;
  v_end timestamptz;
  v_os public.appointments_os;
begin
  select * into v_me from public.profiles where id = auth.uid() and active;
  if v_me.id is null then
    raise exception 'Faça login para agendar' using errcode = '42501';
  end if;
  select * into v_tenant from public.tenants where id = v_me.tenant_id;

  select * into v_vehicle from public.vehicles
   where id = p_vehicle and tenant_id = v_me.tenant_id
     and (owner_id = v_me.id or v_me.role in ('ADMIN', 'OPERATOR'));
  if v_vehicle.id is null then
    raise exception 'Veículo não encontrado' using errcode = 'P0002';
  end if;

  if p_payment = 'PIX' and not v_tenant.pix_enabled then
    raise exception 'Esta loja ainda não aceita Pix antecipado' using errcode = '22023';
  end if;

  -- Serviço principal + adicionais (sem repetir), todos ativos e com preço para o porte do carro.
  create temp table if not exists _booking_items (service_id uuid, kind public.service_kind, name text, price numeric, duration_min integer) on commit drop;
  truncate _booking_items;
  insert into _booking_items
  select s.id, s.kind, s.name, sp.price, s.duration_min
    from public.services s
    join public.service_prices sp on sp.service_id = s.id and sp.category = v_vehicle.category
   where s.tenant_id = v_me.tenant_id and s.active
     and ((s.id = p_service and s.kind = 'MAIN')
       or (s.id = any (coalesce(p_addons, '{}')) and s.kind = 'ADDON' and s.id <> p_service));

  select count(*) filter (where kind = 'MAIN'), sum(price), sum(duration_min)
    into v_count, v_total, v_duration
    from _booking_items;
  if v_count <> 1 then
    raise exception 'Serviço principal indisponível para este porte de veículo' using errcode = '22023';
  end if;
  if (select count(*) from _booking_items) <> 1 + (select count(distinct a) from unnest(coalesce(p_addons, '{}')) a where a <> p_service) then
    raise exception 'Algum adicional não está disponível para este porte' using errcode = '22023';
  end if;

  if p_scheduled_at is null or p_scheduled_at < now() - interval '5 minutes' then
    raise exception 'Escolha um horário futuro' using errcode = '22023';
  end if;
  v_end := p_scheduled_at + make_interval(mins => v_duration);

  -- Horário de funcionamento no fuso da loja.
  v_local := p_scheduled_at at time zone v_tenant.timezone;
  v_hours := v_tenant.opening_hours -> extract(dow from v_local)::int::text;
  if v_hours is null or jsonb_typeof(v_hours) <> 'object'
     or v_local::time < (v_hours ->> 'open')::time
     or (v_end at time zone v_tenant.timezone)::date <> v_local::date
     or (v_end at time zone v_tenant.timezone)::time > (v_hours ->> 'close')::time then
    raise exception 'Fora do horário de funcionamento' using errcode = '22023';
  end if;

  -- Uma reserva por vez por loja: evita dois clientes pegarem o último box no mesmo instante.
  perform pg_advisory_xact_lock(hashtext(v_tenant.id::text));
  if public.os_peak_overlap(v_tenant.id, p_scheduled_at, v_end) >= v_tenant.box_capacity then
    raise exception 'Horário esgotado, escolha outro' using errcode = '23P01';
  end if;

  insert into public.appointments_os (
    tenant_id, origin, customer_id, customer_name, customer_phone, vehicle_id, service_id,
    scheduled_at, duration_min, ends_at, total_amount, payment_method, notes
  ) values (
    v_tenant.id, 'APP', coalesce(v_vehicle.owner_id, v_me.id), v_me.full_name, v_me.phone, v_vehicle.id, p_service,
    p_scheduled_at, v_duration, v_end, v_total, p_payment, nullif(trim(p_notes), '')
  ) returning * into v_os;

  insert into public.os_items (os_id, tenant_id, service_id, kind, name, price, duration_min)
  select v_os.id, v_tenant.id, service_id, kind, name, price, duration_min from _booking_items;

  return v_os;
end;
$$;

revoke all on function public.book_appointment(uuid, uuid, uuid[], timestamptz, public.payment_method, text) from public;
grant execute on function public.book_appointment(uuid, uuid, uuid[], timestamptz, public.payment_method, text) to authenticated;
