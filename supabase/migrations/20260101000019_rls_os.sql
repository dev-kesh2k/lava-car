-- RLS · ordens de serviço e itens.
-- Cliente: só lê as próprias OS (criação passa pela função book_appointment, que valida preço e vaga).
-- Equipe: tudo dentro da própria loja.
alter table public.appointments_os enable row level security;
alter table public.os_items enable row level security;

create policy os_customer_select on public.appointments_os
  for select to authenticated using (customer_id = auth.uid());

create policy os_staff_all on public.appointments_os
  for all to authenticated
  using (public.is_staff() and tenant_id = public.auth_tenant_id())
  with check (public.is_staff() and tenant_id = public.auth_tenant_id());

create policy os_items_customer_select on public.os_items
  for select to authenticated
  using (exists (select 1 from public.appointments_os o where o.id = os_id and o.customer_id = auth.uid()));

create policy os_items_staff_all on public.os_items
  for all to authenticated
  using (public.is_staff() and tenant_id = public.auth_tenant_id())
  with check (public.is_staff() and tenant_id = public.auth_tenant_id());
