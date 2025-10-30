create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "citext";

create type public.menu_category as enum ('drinks', 'food', 'desserts');
create type public.order_status as enum ('pending', 'preparing', 'ready', 'delivered');

create table public.restaurants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  timezone text not null default 'America/Mexico_City',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tables (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_number int not null,
  session_token text,
  session_expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint tables_restaurant_table_unique unique (restaurant_id, table_number)
);

create index tables_restaurant_idx on public.tables (restaurant_id);

create table public.menu_items (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  description text not null,
  price numeric(10,2) not null,
  category public.menu_category not null,
  image_urls text[] not null default '{}',
  allergens text[] not null default '{}',
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index menu_items_restaurant_idx on public.menu_items (restaurant_id);
create index menu_items_category_idx on public.menu_items (category);

create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_id uuid not null references public.tables(id) on delete cascade,
  session_token text not null,
  items jsonb not null,
  allergy_notes text,
  notes text,
  status public.order_status not null default 'pending',
  subtotal numeric(10,2) not null,
  tax numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_restaurant_idx on public.orders (restaurant_id);
create index orders_status_idx on public.orders (status);
create index orders_created_at_idx on public.orders (created_at);
create index orders_session_token_idx on public.orders (session_token);

create table public.users_public (
  id uuid primary key references auth.users(id) on delete cascade,
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  email citext unique not null,
  role text not null,
  full_name text not null,
  created_at timestamptz not null default now()
);

create index users_public_restaurant_idx on public.users_public (restaurant_id);

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger restaurants_updated_at
before update on public.restaurants
for each row execute procedure public.handle_updated_at();

create trigger menu_items_updated_at
before update on public.menu_items
for each row execute procedure public.handle_updated_at();

create trigger orders_updated_at
before update on public.orders
for each row execute procedure public.handle_updated_at();

alter table public.restaurants enable row level security;
alter table public.menu_items enable row level security;
alter table public.tables enable row level security;
alter table public.orders enable row level security;
alter table public.users_public enable row level security;

create policy "Public restaurants read" on public.restaurants
for select using (true);

create policy "Public menu read" on public.menu_items
for select using (is_available);

create policy "Service selects tables" on public.tables
for select using (auth.role() = 'service_role');

create policy "Service writes tables" on public.tables
for update using (auth.role() = 'service_role');

create policy "Service orders access" on public.orders
for all using (auth.role() = 'service_role');

create policy "Service users access" on public.users_public
for all using (auth.role() = 'service_role');