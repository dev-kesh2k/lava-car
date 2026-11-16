-- Cada lava-car é um tenant: tudo no sistema carrega tenant_id.
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  name text not null,
  phone text,
  address text,
  timezone text not null default 'America/Sao_Paulo',
  -- Horário por dia da semana (0 = domingo): {"1": {"open": "08:00", "close": "18:00"}, "0": null, ...}
  opening_hours jsonb not null default '{
    "0": null,
    "1": {"open": "08:00", "close": "18:00"},
    "2": {"open": "08:00", "close": "18:00"},
    "3": {"open": "08:00", "close": "18:00"},
    "4": {"open": "08:00", "close": "18:00"},
    "5": {"open": "08:00", "close": "18:00"},
    "6": {"open": "08:00", "close": "13:00"}
  }'::jsonb,
  -- Quantos carros podem ser lavados ao mesmo tempo (boxes simultâneos).
  box_capacity smallint not null default 2 check (box_capacity between 1 and 50),
  -- De quantos em quantos minutos a agenda oferece horários.
  slot_interval_min smallint not null default 30 check (slot_interval_min in (10, 15, 20, 30, 60)),
  -- Lavagens necessárias para ganhar uma grátis no cartão fidelidade.
  loyalty_goal smallint not null default 10 check (loyalty_goal between 2 and 50),
  pix_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tenants_updated_at before update on public.tenants
  for each row execute function public.set_updated_at();
