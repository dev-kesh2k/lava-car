-- RLS · fluxo de caixa (só o dono) e inscrições de push (cada um as suas).
alter table public.cash_entries enable row level security;
alter table public.push_subscriptions enable row level security;

create policy cash_admin_all on public.cash_entries
  for all to authenticated
  using (public.is_admin() and tenant_id = public.auth_tenant_id())
  with check (public.is_admin() and tenant_id = public.auth_tenant_id());

create policy push_own_all on public.push_subscriptions
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid() and tenant_id = public.auth_tenant_id());
