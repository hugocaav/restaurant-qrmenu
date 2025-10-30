do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on t.oid = e.enumtypid
    where t.typname = 'menu_category'
      and e.enumlabel = 'non_alcoholic'
  ) then
    alter type public.menu_category add value 'non_alcoholic';
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_enum e on t.oid = e.enumtypid
    where t.typname = 'menu_category'
      and e.enumlabel = 'mixology'
  ) then
    alter type public.menu_category add value 'mixology';
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_enum e on t.oid = e.enumtypid
    where t.typname = 'menu_category'
      and e.enumlabel = 'entradas'
  ) then
    alter type public.menu_category add value 'entradas';
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_enum e on t.oid = e.enumtypid
    where t.typname = 'menu_category'
      and e.enumlabel = 'platos_fuertes'
  ) then
    alter type public.menu_category add value 'platos_fuertes';
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_enum e on t.oid = e.enumtypid
    where t.typname = 'menu_category'
      and e.enumlabel = 'postres'
  ) then
    alter type public.menu_category add value 'postres';
  end if;
end
$$;

update public.menu_items
set category = 'mixology'
where category = 'drinks'
  and lower(name) in ('espresso tonic', 'spritz de jamaica');

update public.menu_items
set category = 'non_alcoholic'
where category = 'drinks'
  and lower(name) in ('limonada de pepino y hierbabuena', 'té frío oolong cítrico');

update public.menu_items
set category = 'entradas'
where category = 'food'
  and lower(name) in ('guacamole ahumado', 'elote callejero trufado');

update public.menu_items
set category = 'platos_fuertes'
where category = 'food'
  and lower(name) in ('taco crujiente de camarón', 'tostada de atún');

update public.menu_items
set category = 'postres'
where category = 'desserts';
