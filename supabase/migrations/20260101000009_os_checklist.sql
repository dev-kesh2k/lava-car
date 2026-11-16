-- Vistoria de entrada: até 4 fotos e marcação de avarias pré-existentes (resguarda a loja).
create table public.os_checklist (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null unique references public.appointments_os (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  -- Caminhos no bucket vehicle-photos: <tenant_id>/<os_id>/<arquivo>.jpg
  photos text[] not null default '{}' check (cardinality(photos) <= 4),
  -- [{"area": "FRONT", "type": "SCRATCH", "note": "risco no para-choque"}]
  damages jsonb not null default '[]'::jsonb check (jsonb_typeof(damages) = 'array'),
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger os_checklist_updated_at before update on public.os_checklist
  for each row execute function public.set_updated_at();
