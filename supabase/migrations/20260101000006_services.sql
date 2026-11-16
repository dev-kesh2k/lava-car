-- Catálogo de serviços da loja. O preço fica em service_prices (um por porte de veículo).
create table public.services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  description text not null default '',
  kind public.service_kind not null default 'MAIN',
  duration_min smallint not null check (duration_min between 5 and 600),
  active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create index services_tenant_idx on public.services (tenant_id, active, sort_order);

create trigger services_updated_at before update on public.services
  for each row execute function public.set_updated_at();

-- Matriz de preços: Lavagem Completa → Hatch R$ 50, Sedan R$ 60, SUV R$ 75, Caminhonete R$ 90.
create table public.service_prices (
  service_id uuid not null references public.services (id) on delete cascade,
  category public.vehicle_category not null,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  price numeric(10, 2) not null check (price >= 0),
  primary key (service_id, category)
);

create index service_prices_tenant_idx on public.service_prices (tenant_id);
