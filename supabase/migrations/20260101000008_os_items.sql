-- Itens da OS: serviço principal + adicionais, com nome/preço/duração congelados no momento da venda.
create table public.os_items (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.appointments_os (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  kind public.service_kind not null,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  duration_min smallint not null check (duration_min > 0)
);

create index os_items_os_idx on public.os_items (os_id);
create index os_items_tenant_service_idx on public.os_items (tenant_id, service_id);
