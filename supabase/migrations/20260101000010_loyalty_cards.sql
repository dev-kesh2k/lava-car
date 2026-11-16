-- Cartão fidelidade digital: selos por lavagem; ao completar a meta da loja vira uma lavagem grátis.
create table public.loyalty_cards (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  stamps smallint not null default 0 check (stamps >= 0),
  rewards_available smallint not null default 0 check (rewards_available >= 0),
  rewards_redeemed integer not null default 0,
  total_washes integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (tenant_id, customer_id)
);

create trigger loyalty_cards_updated_at before update on public.loyalty_cards
  for each row execute function public.set_updated_at();
