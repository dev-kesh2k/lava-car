-- Dados de demonstração (supabase db reset aplica automaticamente).
insert into public.tenants (id, slug, name, phone, address, box_capacity, slot_interval_min, loyalty_goal, pix_enabled)
values ('00000000-0000-0000-0000-000000000001', 'lava-car-demo', 'Lava Car Demo', '5545999990000',
        'Av. Brasil, 1000 - Centro', 2, 30, 10, true)
on conflict (id) do nothing;

with s as (
  insert into public.services (tenant_id, name, description, kind, duration_min, sort_order) values
    ('00000000-0000-0000-0000-000000000001', 'Lavagem Simples', 'Externa com shampoo neutro e secagem', 'MAIN', 30, 1),
    ('00000000-0000-0000-0000-000000000001', 'Lavagem Completa', 'Externa + aspiração + painel e vidros', 'MAIN', 60, 2),
    ('00000000-0000-0000-0000-000000000001', 'Higienização Interna', 'Bancos, carpetes e teto com extratora', 'MAIN', 180, 3),
    ('00000000-0000-0000-0000-000000000001', 'Cera Líquida', 'Brilho e proteção da pintura', 'ADDON', 15, 10),
    ('00000000-0000-0000-0000-000000000001', 'Pretinho nos Pneus', 'Acabamento dos pneus', 'ADDON', 5, 11),
    ('00000000-0000-0000-0000-000000000001', 'Hidratação de Couro', 'Limpeza e hidratação dos bancos de couro', 'ADDON', 40, 12)
  on conflict (tenant_id, name) do nothing
  returning id, name
)
insert into public.service_prices (service_id, category, tenant_id, price)
select s.id, p.category::public.vehicle_category, '00000000-0000-0000-0000-000000000001', p.price
  from s
  join (values
    ('Lavagem Simples', 'HATCH', 35), ('Lavagem Simples', 'SEDAN', 40), ('Lavagem Simples', 'SUV', 50), ('Lavagem Simples', 'PICKUP', 60),
    ('Lavagem Completa', 'HATCH', 55), ('Lavagem Completa', 'SEDAN', 65), ('Lavagem Completa', 'SUV', 80), ('Lavagem Completa', 'PICKUP', 95),
    ('Higienização Interna', 'HATCH', 180), ('Higienização Interna', 'SEDAN', 200), ('Higienização Interna', 'SUV', 250), ('Higienização Interna', 'PICKUP', 280),
    ('Cera Líquida', 'HATCH', 20), ('Cera Líquida', 'SEDAN', 25), ('Cera Líquida', 'SUV', 30), ('Cera Líquida', 'PICKUP', 35),
    ('Pretinho nos Pneus', 'HATCH', 10), ('Pretinho nos Pneus', 'SEDAN', 10), ('Pretinho nos Pneus', 'SUV', 15), ('Pretinho nos Pneus', 'PICKUP', 15),
    ('Hidratação de Couro', 'HATCH', 60), ('Hidratação de Couro', 'SEDAN', 70), ('Hidratação de Couro', 'SUV', 90), ('Hidratação de Couro', 'PICKUP', 90)
  ) as p(name, category, price) on p.name = s.name
on conflict do nothing;
