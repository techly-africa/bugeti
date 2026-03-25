-- Updates RLS policies for budgets, categories, and transactions to enforce
-- private account visibility: common budgets are household-wide; private
-- budgets are only accessible by the creator.

-- budgets
drop policy if exists "Budget household access" on public.budgets;
create policy "Budget household access" on public.budgets
  for select using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
    and (account_type = 'common' or created_by = auth.uid())
  );

drop policy if exists "Budget insert" on public.budgets;
create policy "Budget insert" on public.budgets
  for insert with check (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

drop policy if exists "Budget update" on public.budgets;
create policy "Budget update" on public.budgets
  for update using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
    and (account_type = 'common' or created_by = auth.uid())
  );

drop policy if exists "Budget delete" on public.budgets;
create policy "Budget delete" on public.budgets
  for delete using (created_by = auth.uid());

-- categories: inherit budget visibility rules
drop policy if exists "Category household access" on public.categories;
create policy "Category household access" on public.categories
  for all using (
    budget_id in (
      select id from public.budgets
      where household_id in (
        select household_id from public.household_members where user_id = auth.uid()
      )
      and (account_type = 'common' or created_by = auth.uid())
    )
  );
