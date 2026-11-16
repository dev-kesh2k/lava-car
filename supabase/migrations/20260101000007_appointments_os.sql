-- Agendamentos e Ordens de Serviço: a mesma linha nasce como agendamento e vira OS no pátio.
create table public.appointments_os (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  -- Número curto para o balcão ("OS 128").
  number bigint generated always as identity,
  origin public.os_origin not null default 'APP',
  customer_id uuid references public.profiles (id) on delete set null,
  -- Cliente avulso não tem conta: nome e telefone ficam na própria OS.
  customer_name text not null default '',
  customer_phone text,
  vehicle_id uuid not null references public.vehicles (id) on delete restrict,
  service_id uuid references public.services (id) on delete set null,
  employee_id uuid references public.profiles (id) on delete set null,
  scheduled_at timestamptz not null,
  duration_min smallint not null check (duration_min > 0),
  ends_at timestamptz not null,
  status public.os_status not null default 'SCHEDULED',
  total_amount numeric(10, 2) not null default 0 check (total_amount >= 0),
  payment_method public.payment_method not null default 'ON_SITE',
  payment_status public.payment_status not null default 'PENDING',
  paid_at timestamptz,
  -- Pix (Mercado Pago/Asaas): id do pagamento e QR Code copia-e-cola.
  pix_payment_id text unique,
  pix_qr_code text,
  pix_qr_base64 text,
  pix_expires_at timestamptz,
  notes text,
  started_at timestamptz,
  finished_at timestamptz,
  delivered_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > scheduled_at)
);

create index os_tenant_schedule_idx on public.appointments_os (tenant_id, scheduled_at);
create index os_tenant_status_idx on public.appointments_os (tenant_id, status);
create index os_customer_idx on public.appointments_os (customer_id, scheduled_at desc);
create index os_employee_idx on public.appointments_os (employee_id, finished_at);
create index os_vehicle_idx on public.appointments_os (vehicle_id);

create trigger appointments_os_updated_at before update on public.appointments_os
  for each row execute function public.set_updated_at();

-- ends_at sempre = scheduled_at + duração (não dá para ser coluna gerada: timestamptz + interval não é imutável).
create or replace function public.os_set_ends_at()
returns trigger
language plpgsql
as $$
begin
  new.ends_at := new.scheduled_at + make_interval(mins => new.duration_min);
  return new;
end;
$$;

create trigger appointments_os_ends_at before insert or update of scheduled_at, duration_min on public.appointments_os
  for each row execute function public.os_set_ends_at();
