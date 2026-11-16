-- Fase 1 · Fundação: extensões e tipos enumerados usados em todo o schema.
create extension if not exists pgcrypto;

-- Papéis do sistema: dono da loja, lavador/balcão e cliente final.
create type public.app_role as enum ('ADMIN', 'OPERATOR', 'CUSTOMER');

-- Porte do veículo: o preço de cada serviço muda conforme o porte.
create type public.vehicle_category as enum ('HATCH', 'SEDAN', 'SUV', 'PICKUP');

-- Fila do pátio: Agendado → No pátio (aguardando) → Lavando → Finalizando → Pronto → Entregue.
create type public.os_status as enum ('SCHEDULED', 'WAITING', 'WASHING', 'FINISHING', 'READY', 'DELIVERED', 'CANCELED');

create type public.payment_status as enum ('PENDING', 'PAID', 'REFUNDED', 'CANCELED');
create type public.payment_method as enum ('ON_SITE', 'PIX');

-- Serviço principal (lavagem) ou adicional (cera, pretinho, hidratação de couro...).
create type public.service_kind as enum ('MAIN', 'ADDON');

-- Origem da OS: agendada pelo app ou aberta no balcão (cliente avulso).
create type public.os_origin as enum ('APP', 'WALK_IN');

create type public.cash_entry_type as enum ('INCOME', 'EXPENSE');
