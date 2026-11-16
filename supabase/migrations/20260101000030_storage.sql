-- Storage: fotos da vistoria em bucket privado, organizadas por <tenant_id>/<os_id>/<arquivo>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vehicle-photos', 'vehicle-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "equipe envia fotos da loja" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vehicle-photos'
    and public.is_staff()
    and (storage.foldername(name))[1] = public.auth_tenant_id()::text
  );

create policy "equipe vê fotos da loja" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'vehicle-photos'
    and public.is_staff()
    and (storage.foldername(name))[1] = public.auth_tenant_id()::text
  );

create policy "equipe apaga fotos da loja" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'vehicle-photos'
    and public.is_staff()
    and (storage.foldername(name))[1] = public.auth_tenant_id()::text
  );

-- O cliente vê as fotos da vistoria do próprio carro.
create policy "cliente vê fotos das próprias OS" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'vehicle-photos'
    and exists (
      select 1 from public.appointments_os o
       where o.id::text = (storage.foldername(name))[2]
         and o.customer_id = auth.uid()
    )
  );
