-- supabase/seeds/seed.sql
-- Semilla idempotente para demo de restaurantes

begin;

-- =========================================================
-- 1) Extensiones (elige la que uses para UUID por DEFAULT)
-- =========================================================
-- Si tu DEFAULT es uuid_generate_v4(), habilita uuid-ossp:
create extension if not exists "uuid-ossp";

-- Si en tu esquema usas gen_random_uuid(), descomenta esta:
-- create extension if not exists "pgcrypto";

-- =========================================================
-- 2) Restaurante demo
-- =========================================================
insert into public.restaurants (id, name)
values ('dbd7e5cb-5b4f-416d-b1d4-5892c453b5c9', 'Restaurante Demo')
on conflict (id) do nothing;

-- =========================================================
-- 3) Índices/constraints para idempotencia y consistencia
--    (se crean una sola vez)
-- =========================================================

-- Cada mesa única por restaurante+número de mesa
create unique index if not exists ux_tables_restaurant_tablenumber
  on public.tables (restaurant_id, table_number);

-- Cada platillo único por restaurante+nombre (permite ON CONFLICT)
create unique index if not exists ux_menu_items_restaurant_name
  on public.menu_items (restaurant_id, name);

-- =========================================================
-- 4) Mesas demo (5 mesas)
-- =========================================================
insert into public.tables (id, restaurant_id, table_number, is_active)
values
  ('79b75547-5eaf-4183-9a05-e4869ce9a29c', 'dbd7e5cb-5b4f-416d-b1d4-5892c453b5c9', 1, true),
  ('c532b6f1-8a38-4dc0-b47f-4a7f9b3ac6f2', 'dbd7e5cb-5b4f-416d-b1d4-5892c453b5c9', 2, true),
  ('a74c7d71-2e73-4edb-8c42-51d072a766a1', 'dbd7e5cb-5b4f-416d-b1d4-5892c453b5c9', 3, true),
  ('d1a9e0a2-6b7c-4c20-9a9e-0c1b2a3d4e5f', 'dbd7e5cb-5b4f-416d-b1d4-5892c453b5c9', 4, true),
  ('e2b0f1c3-7d8e-4f31-a0b1-1d2c3e4f5a6b', 'dbd7e5cb-5b4f-416d-b1d4-5892c453b5c9', 5, true)
on conflict (id) do nothing;

-- También soporta re-ejecución por el índice único:
-- Si prefieres, puedes usar:
-- on conflict (restaurant_id, table_number) do nothing;

-- =========================================================
-- 5) Menú demo (12 items). Omitimos 'id' para que Postgres
--     genere UUID automáticamente vía DEFAULT.
-- =========================================================
-- 5) Limpieza de menú demo (deja catálogo vacío para que el owner agregue platillos)
delete from public.orders where restaurant_id = 'dbd7e5cb-5b4f-416d-b1d4-5892c453b5c9';
delete from public.menu_items where restaurant_id = 'dbd7e5cb-5b4f-416d-b1d4-5892c453b5c9';

delete from public.tables where restaurant_id = 'dbd7e5cb-5b4f-416d-b1d4-5892c453b5c9' and table_number > 5;

commit;