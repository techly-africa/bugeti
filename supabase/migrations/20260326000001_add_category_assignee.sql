-- Add optional member assignment to categories.
-- assigned_to references household_members(id) so we can look up display_name.
-- On member removal, we NULL the assignment rather than delete the category.

alter table public.categories
  add column if not exists assigned_to uuid
    references public.household_members(id)
    on delete set null;

comment on column public.categories.assigned_to is
  'Optional: the household_member responsible for this budget category.';
