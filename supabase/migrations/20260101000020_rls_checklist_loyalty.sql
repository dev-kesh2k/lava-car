-- RLS · vistoria e fidelidade.
alter table public.os_checklist enable row level security;
alter table public.loyalty_cards enable row level security;

create policy checklist_staff_all on public.os_checklist
  for all to authenticated
  using (public.is_staff() and tenant_id = public.auth_tenant_id())
  with check (public.is_staff() and tenant_id = public.auth_tenant_id());

-- O cliente pode ver a vistoria do próprio carro (transparência sobre avarias).
create policy checklist_customer_select on public.os_checklist
  for select to authenticated
  using (exists (select 1 from public.appointments_os o where o.id = os_id and o.customer_id = auth.uid()));

create policy loyalty_customer_select on public.loyalty_cards
  for select to authenticated using (customer_id = auth.uid());

create policy loyalty_staff_select on public.loyalty_cards
  for select to authenticated using (public.is_staff() and tenant_id = public.auth_tenant_id());

-- Selos só mudam por trigger/funções; o dono pode corrigir manualmente.
create policy loyalty_admin_update on public.loyalty_cards
  for update to authenticated
  using (public.is_admin() and tenant_id = public.auth_tenant_id())
  with check (tenant_id = public.auth_tenant_id());
