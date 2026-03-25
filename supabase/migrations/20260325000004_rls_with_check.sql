-- Adds WITH CHECK clauses to all INSERT/UPDATE-capable RLS policies.
--
-- PostgreSQL RLS: USING controls row visibility for SELECT/UPDATE/DELETE.
-- For INSERT (and UPDATE new-row validation), only WITH CHECK is enforced.
-- Without WITH CHECK, any authenticated user can insert rows that bypass
-- the household scoping — the USING clause simply does not apply to INSERTs.

-- ─── budgets ──────────────────────────────────────────────────────────────────

drop policy if exists "Budget household access" on public.budgets;
create policy "Budget household access" on public.budgets
  for select using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
    and (account_type in ('common', 'savings') or created_by = auth.uid())
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
  for update
  using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
    and (account_type in ('common', 'savings') or created_by = auth.uid())
  )
  with check (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

drop policy if exists "Budget delete" on public.budgets;
create policy "Budget delete" on public.budgets
  for delete using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
    and created_by = auth.uid()
  );

-- ─── categories ───────────────────────────────────────────────────────────────

drop policy if exists "Category household access" on public.categories;

create policy "Category select" on public.categories
  for select using (
    budget_id in (
      select id from public.budgets
      where household_id in (
        select household_id from public.household_members where user_id = auth.uid()
      )
      and (account_type in ('common', 'savings') or created_by = auth.uid())
    )
  );

create policy "Category insert" on public.categories
  for insert with check (
    budget_id in (
      select id from public.budgets
      where household_id in (
        select household_id from public.household_members where user_id = auth.uid()
      )
      and (account_type in ('common', 'savings') or created_by = auth.uid())
    )
  );

create policy "Category update" on public.categories
  for update
  using (
    budget_id in (
      select id from public.budgets
      where household_id in (
        select household_id from public.household_members where user_id = auth.uid()
      )
      and (account_type in ('common', 'savings') or created_by = auth.uid())
    )
  )
  with check (
    budget_id in (
      select id from public.budgets
      where household_id in (
        select household_id from public.household_members where user_id = auth.uid()
      )
      and (account_type in ('common', 'savings') or created_by = auth.uid())
    )
  );

create policy "Category delete" on public.categories
  for delete using (
    budget_id in (
      select id from public.budgets
      where household_id in (
        select household_id from public.household_members where user_id = auth.uid()
      )
      and (account_type in ('common', 'savings') or created_by = auth.uid())
    )
  );

-- ─── transactions ─────────────────────────────────────────────────────────────

drop policy if exists "Transaction household access" on public.transactions;

create policy "Transaction select" on public.transactions
  for select using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
    and budget_id in (
      select id from public.budgets
      where household_id in (
        select household_id from public.household_members where user_id = auth.uid()
      )
      and (account_type in ('common', 'savings') or created_by = auth.uid())
    )
  );

create policy "Transaction insert" on public.transactions
  for insert with check (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
    and budget_id in (
      select id from public.budgets
      where household_id in (
        select household_id from public.household_members where user_id = auth.uid()
      )
      and (account_type in ('common', 'savings') or created_by = auth.uid())
    )
  );

create policy "Transaction update" on public.transactions
  for update
  using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
    and budget_id in (
      select id from public.budgets
      where household_id in (
        select household_id from public.household_members where user_id = auth.uid()
      )
      and (account_type in ('common', 'savings') or created_by = auth.uid())
    )
  )
  with check (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
    and budget_id in (
      select id from public.budgets
      where household_id in (
        select household_id from public.household_members where user_id = auth.uid()
      )
      and (account_type in ('common', 'savings') or created_by = auth.uid())
    )
  );

create policy "Transaction delete" on public.transactions
  for delete using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
    and added_by = auth.uid()
  );
