-- Adds parent_id and level to categories to support sub-budget hierarchies.
-- parent_id: null = top-level category; set = child of another category
-- level: 0 = root, 1 = sub, 2 = sub-sub (max depth of 3 levels)

alter table public.categories
  add column if not exists parent_id uuid references public.categories(id) on delete cascade,
  add column if not exists level integer not null default 0 check (level between 0 and 2);
