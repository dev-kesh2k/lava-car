-- Garagem virtual: carros dos clientes (owner_id nulo = carro de cliente avulso do balcão).
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  owner_id uuid references public.profiles (id) on delete set null,
  -- Placa normalizada: só letras maiúsculas e números (ABC1D23 ou ABC1234).
  plate text not null check (plate ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$'),
  model text not null default '',
  color text not null default '',
  category public.vehicle_category not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, plate)
);

create index vehicles_owner_idx on public.vehicles (owner_id);

create trigger vehicles_updated_at before update on public.vehicles
  for each row execute function public.set_updated_at();
