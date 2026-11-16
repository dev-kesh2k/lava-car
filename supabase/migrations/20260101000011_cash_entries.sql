-- Fluxo de caixa: entradas automáticas (OS pagas) e despesas lançadas pelo dono.
create table public.cash_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  type public.cash_entry_type not null,
  category text not null default 'Outros',
  description text not null default '',
  amount numeric(10, 2) not null check (amount > 0),
  occurred_on date not null default current_date,
  -- Entrada gerada por uma OS paga (no máximo uma por OS).
  os_id uuid unique references public.appointments_os (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index cash_entries_tenant_date_idx on public.cash_entries (tenant_id, occurred_on);
