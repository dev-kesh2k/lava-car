-- Realtime: o Kanban do pátio e o acompanhamento do cliente recebem as mudanças de status sem F5.
-- O Realtime respeita o RLS: cada cliente só recebe as próprias OS.
alter publication supabase_realtime add table public.appointments_os;
alter table public.appointments_os replica identity full;
