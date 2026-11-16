-- Disponibilidade da agenda: cruza a duração de cada OS com a capacidade de boxes simultâneos.

-- Pico de carros ao mesmo tempo dentro do intervalo [p_start, p_end).
-- O pico só pode acontecer no início do intervalo ou no início de alguma OS dentro dele.
create or replace function public.os_peak_overlap(p_tenant uuid, p_start timestamptz, p_end timestamptz, p_exclude uuid default null)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with busy as (
    select scheduled_at, ends_at
      from public.appointments_os
     where tenant_id = p_tenant
       and status <> 'CANCELED'
       and (p_exclude is null or id <> p_exclude)
       and scheduled_at < p_end
       and ends_at > p_start
  ),
  points as (
    select p_start as pt
    union
    select scheduled_at from busy where scheduled_at > p_start
  )
  select coalesce(max((select count(*) from busy b where b.scheduled_at <= p.pt and b.ends_at > p.pt)), 0)::integer
    from points p;
$$;

-- Horários ocupados da loja (sem dados pessoais) para o app montar a grade de horários.
create or replace function public.get_busy_intervals(p_from timestamptz, p_to timestamptz)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select o.scheduled_at, o.ends_at
    from public.appointments_os o
   where o.tenant_id = public.auth_tenant_id()
     and o.status <> 'CANCELED'
     and o.scheduled_at < p_to
     and o.ends_at > p_from
   order by o.scheduled_at;
$$;

revoke all on function public.os_peak_overlap(uuid, timestamptz, timestamptz, uuid) from public;
grant execute on function public.get_busy_intervals(timestamptz, timestamptz) to authenticated;
