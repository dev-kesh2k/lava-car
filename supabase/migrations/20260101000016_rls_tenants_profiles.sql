-- RLS · lojas e perfis.
alter table public.tenants enable row level security;
alter table public.profiles enable row level security;

-- Nome, horários e capacidade da loja são públicos (a tela de login/cadastro mostra a loja).
create policy tenants_select_public on public.tenants
  for select to anon, authenticated using (true);

create policy tenants_update_admin on public.tenants
  for update to authenticated
  using (public.is_admin() and id = public.auth_tenant_id())
  with check (id = public.auth_tenant_id());

-- Cada um vê o próprio perfil; funcionários veem os perfis da própria loja.
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or (public.is_staff() and tenant_id = public.auth_tenant_id()));

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin() and tenant_id = public.auth_tenant_id())
  with check (tenant_id = public.auth_tenant_id());
