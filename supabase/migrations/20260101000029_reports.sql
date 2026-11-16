-- Relatórios do dono: painel gerencial e fechamento de comissões. Datas no fuso da loja.

create or replace function public.dashboard_summary(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.auth_tenant_id();
  v_tz text;
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Somente o administrador vê o painel gerencial' using errcode = '42501';
  end if;
  select timezone into v_tz from public.tenants where id = v_tenant;

  with paid as (
    select * from public.appointments_os
     where tenant_id = v_tenant and payment_status = 'PAID'
       and (paid_at at time zone v_tz)::date between p_from and p_to
  ),
  washed as (
    select * from public.appointments_os
     where tenant_id = v_tenant and status in ('READY', 'DELIVERED')
       and (finished_at at time zone v_tz)::date between p_from and p_to
  ),
  top as (
    select i.name, count(*) as qty, sum(i.price) as revenue
      from washed w join public.os_items i on i.os_id = w.id
     group by i.name
     order by qty desc, revenue desc
     limit 5
  ),
  days as (
    select d::date as day,
           coalesce((select sum(total_amount) from paid where (paid_at at time zone v_tz)::date = d::date), 0) as revenue,
           (select count(*) from washed where (finished_at at time zone v_tz)::date = d::date) as cars
      from generate_series(p_from, p_to, interval '1 day') d
  )
  select jsonb_build_object(
    'revenue', coalesce((select sum(total_amount) from paid), 0),
    'paid_count', (select count(*) from paid),
    'cars_washed', (select count(*) from washed),
    'avg_ticket', coalesce((select round(avg(total_amount), 2) from paid), 0),
    'top_services', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'qty', qty, 'revenue', revenue)) from top), '[]'::jsonb),
    'by_day', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'revenue', revenue, 'cars', cars) order by day) from days), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

-- Comissão por funcionário: % de cada um sobre o valor das OS que ele concluiu no período.
create or replace function public.commission_report(p_from date, p_to date)
returns table (
  employee_id uuid,
  full_name text,
  commission_pct numeric,
  os_count bigint,
  gross numeric,
  commission numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.auth_tenant_id();
  v_tz text;
begin
  if not public.is_admin() then
    raise exception 'Somente o administrador vê as comissões' using errcode = '42501';
  end if;
  select timezone into v_tz from public.tenants where id = v_tenant;

  return query
  select p.id, p.full_name, p.commission_pct,
         count(o.id),
         coalesce(sum(o.total_amount), 0)::numeric,
         round(coalesce(sum(o.total_amount), 0) * p.commission_pct / 100, 2)::numeric
    from public.profiles p
    left join public.appointments_os o
      on o.employee_id = p.id
     and o.status in ('READY', 'DELIVERED')
     and (o.finished_at at time zone v_tz)::date between p_from and p_to
   where p.tenant_id = v_tenant and p.role in ('ADMIN', 'OPERATOR')
   group by p.id
   order by 5 desc, p.full_name;
end;
$$;

revoke all on function public.dashboard_summary(date, date), public.commission_report(date, date) from public;
grant execute on function public.dashboard_summary(date, date), public.commission_report(date, date) to authenticated;
