-- RLS · serviços e preços: todos os usuários da loja leem; só o dono altera.
alter table public.services enable row level security;
alter table public.service_prices enable row level security;

create policy services_select on public.services
  for select to authenticated using (tenant_id = public.auth_tenant_id());

create policy services_admin_write on public.services
  for all to authenticated
  using (public.is_admin() and tenant_id = public.auth_tenant_id())
  with check (public.is_admin() and tenant_id = public.auth_tenant_id());

create policy service_prices_select on public.service_prices
  for select to authenticated using (tenant_id = public.auth_tenant_id());

create policy service_prices_admin_write on public.service_prices
  for all to authenticated
  using (public.is_admin() and tenant_id = public.auth_tenant_id())
  with check (public.is_admin() and tenant_id = public.auth_tenant_id());
