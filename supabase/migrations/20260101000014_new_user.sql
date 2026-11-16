-- Cadastro: todo usuário novo do Auth vira CUSTOMER da loja informada em raw_user_meta_data.tenant_slug
-- (ou da primeira loja, se não informar) e já ganha o cartão fidelidade zerado.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
begin
  select id into v_tenant from public.tenants where slug = new.raw_user_meta_data ->> 'tenant_slug';
  if v_tenant is null then
    select id into v_tenant from public.tenants order by created_at limit 1;
  end if;
  if v_tenant is null then
    raise exception 'Nenhuma loja cadastrada';
  end if;

  insert into public.profiles (id, tenant_id, role, full_name, phone, email)
  values (
    new.id,
    v_tenant,
    'CUSTOMER',
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.phone, new.raw_user_meta_data ->> 'phone'),
    new.email
  );

  insert into public.loyalty_cards (tenant_id, customer_id) values (v_tenant, new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
