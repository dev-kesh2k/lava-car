-- Perfil de cada usuário do Supabase Auth, ligado a uma loja e a um papel.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  role public.app_role not null default 'CUSTOMER',
  full_name text not null default '',
  phone text,
  email text,
  -- Percentual de comissão do funcionário sobre o valor das OS que ele executou.
  commission_pct numeric(5, 2) not null default 0 check (commission_pct between 0 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_tenant_role_idx on public.profiles (tenant_id, role);
create index profiles_phone_idx on public.profiles (tenant_id, phone);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
