-- Funções auxiliares das políticas de RLS. SECURITY DEFINER evita recursão ao ler profiles dentro das políticas.
create or replace function public.auth_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.profiles where id = auth.uid() and active;
$$;

create or replace function public.auth_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and active;
$$;

-- Funcionário da loja (dono ou operador).
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.auth_role() in ('ADMIN', 'OPERATOR'), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.auth_role() = 'ADMIN', false);
$$;

revoke all on function public.auth_tenant_id(), public.auth_role(), public.is_staff(), public.is_admin() from public;
grant execute on function public.auth_tenant_id(), public.auth_role(), public.is_staff(), public.is_admin() to authenticated;
