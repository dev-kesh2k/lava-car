-- RLS · veículos: o cliente só enxerga e mexe nos próprios carros; a equipe vê todos da loja.
alter table public.vehicles enable row level security;

create policy vehicles_customer_all on public.vehicles
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and tenant_id = public.auth_tenant_id());

create policy vehicles_staff_all on public.vehicles
  for all to authenticated
  using (public.is_staff() and tenant_id = public.auth_tenant_id())
  with check (public.is_staff() and tenant_id = public.auth_tenant_id());
