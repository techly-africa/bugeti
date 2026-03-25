-- Wraps the repeated household membership lookup into a single
-- SECURITY DEFINER function.
--
-- WHY: Every RLS policy that scopes by household runs a subquery:
--   SELECT household_id FROM household_members WHERE user_id = auth.uid()
-- Without this, PostgreSQL re-evaluates that subquery for every row it
-- checks, potentially doing O(rows) sequential scans on household_members.
-- A SECURITY DEFINER function with a stable search path is inlined by the
-- planner and its result is cached for the duration of the statement.

create or replace function public.get_my_household_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select household_id
  from   public.household_members
  where  user_id = auth.uid();
$$;

-- Revoke direct execute from public; only the RLS policies need it via the
-- definer context (the function runs as its owner, not the calling role).
revoke execute on function public.get_my_household_ids() from public;
grant  execute on function public.get_my_household_ids() to authenticated;

-- ─── Rewrite the hottest policies to use the helper ───────────────────────────

-- budgets
drop policy if exists "Budget household access" on public.budgets;
create policy "Budget household access" on public.budgets
  for select using (
    household_id in (select public.get_my_household_ids())
    and (account_type in ('common', 'savings') or created_by = auth.uid())
  );

drop policy if exists "Budget insert" on public.budgets;
create policy "Budget insert" on public.budgets
  for insert with check (
    household_id in (select public.get_my_household_ids())
  );

drop policy if exists "Budget update" on public.budgets;
create policy "Budget update" on public.budgets
  for update
  using (
    household_id in (select public.get_my_household_ids())
    and (account_type in ('common', 'savings') or created_by = auth.uid())
  )
  with check (
    household_id in (select public.get_my_household_ids())
  );

drop policy if exists "Budget delete" on public.budgets;
create policy "Budget delete" on public.budgets
  for delete using (
    household_id in (select public.get_my_household_ids())
    and created_by = auth.uid()
  );

-- categories (budget_id scoped through budget membership)
drop policy if exists "Category select" on public.categories;
create policy "Category select" on public.categories
  for select using (
    budget_id in (
      select id from public.budgets
      where  household_id in (select public.get_my_household_ids())
        and  (account_type in ('common', 'savings') or created_by = auth.uid())
    )
  );

drop policy if exists "Category insert" on public.categories;
create policy "Category insert" on public.categories
  for insert with check (
    budget_id in (
      select id from public.budgets
      where  household_id in (select public.get_my_household_ids())
        and  (account_type in ('common', 'savings') or created_by = auth.uid())
    )
  );

drop policy if exists "Category update" on public.categories;
create policy "Category update" on public.categories
  for update
  using (
    budget_id in (
      select id from public.budgets
      where  household_id in (select public.get_my_household_ids())
        and  (account_type in ('common', 'savings') or created_by = auth.uid())
    )
  )
  with check (
    budget_id in (
      select id from public.budgets
      where  household_id in (select public.get_my_household_ids())
        and  (account_type in ('common', 'savings') or created_by = auth.uid())
    )
  );

drop policy if exists "Category delete" on public.categories;
create policy "Category delete" on public.categories
  for delete using (
    budget_id in (
      select id from public.budgets
      where  household_id in (select public.get_my_household_ids())
        and  (account_type in ('common', 'savings') or created_by = auth.uid())
    )
  );

-- transactions
drop policy if exists "Transaction select" on public.transactions;
create policy "Transaction select" on public.transactions
  for select using (
    household_id in (select public.get_my_household_ids())
    and budget_id in (
      select id from public.budgets
      where  household_id in (select public.get_my_household_ids())
        and  (account_type in ('common', 'savings') or created_by = auth.uid())
    )
  );

drop policy if exists "Transaction insert" on public.transactions;
create policy "Transaction insert" on public.transactions
  for insert with check (
    household_id in (select public.get_my_household_ids())
    and budget_id in (
      select id from public.budgets
      where  household_id in (select public.get_my_household_ids())
        and  (account_type in ('common', 'savings') or created_by = auth.uid())
    )
  );

drop policy if exists "Transaction update" on public.transactions;
create policy "Transaction update" on public.transactions
  for update
  using (
    household_id in (select public.get_my_household_ids())
    and budget_id in (
      select id from public.budgets
      where  household_id in (select public.get_my_household_ids())
        and  (account_type in ('common', 'savings') or created_by = auth.uid())
    )
  )
  with check (
    household_id in (select public.get_my_household_ids())
    and budget_id in (
      select id from public.budgets
      where  household_id in (select public.get_my_household_ids())
        and  (account_type in ('common', 'savings') or created_by = auth.uid())
    )
  );

drop policy if exists "Transaction delete" on public.transactions;
create policy "Transaction delete" on public.transactions
  for delete using (
    household_id in (select public.get_my_household_ids())
    and added_by = auth.uid()
  );
