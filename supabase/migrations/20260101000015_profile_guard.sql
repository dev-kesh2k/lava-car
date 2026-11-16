-- O próprio usuário pode editar nome/telefone, mas só o dono da loja muda papel, comissão, loja ou status.
create or replace function public.profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new; -- service role / migrações
  end if;
  if (new.role, new.commission_pct, new.tenant_id, new.active)
     is distinct from (old.role, old.commission_pct, old.tenant_id, old.active) then
    if not public.is_admin() or old.tenant_id <> public.auth_tenant_id() or new.tenant_id <> old.tenant_id then
      raise exception 'Somente o administrador da loja pode alterar papel, comissão ou status'
        using errcode = '42501';
    end if;
    if new.id = auth.uid() and new.role <> 'ADMIN' then
      raise exception 'O administrador não pode remover o próprio acesso' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();
