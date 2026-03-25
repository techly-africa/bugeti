-- Enables RLS and adds access policies for the ikimina tables.
-- All household members can read and write ikimina data for their household.

alter table public.ikimina enable row level security;
alter table public.ikimina_contributions enable row level security;

drop policy if exists "Ikimina household access" on public.ikimina;
create policy "Ikimina household access" on public.ikimina
  for all using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

drop policy if exists "Ikimina contributions access" on public.ikimina_contributions;
create policy "Ikimina contributions access" on public.ikimina_contributions
  for all using (
    ikimina_id in (
      select id from public.ikimina
      where household_id in (
        select household_id from public.household_members where user_id = auth.uid()
      )
    )
  );
