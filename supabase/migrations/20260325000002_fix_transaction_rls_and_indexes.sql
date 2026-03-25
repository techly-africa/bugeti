-- Fixes two issues introduced in 20260325000001:
--
-- 1. SECURITY: Transaction RLS policy was missing the household_id scope on the
--    budget_id subquery. A user could attach a transaction to a budget from a
--    different household, polluting cross-household data.
--
-- 2. PERFORMANCE: Adds indexes that make the RLS subqueries fast. Without them,
--    every row evaluation does a seq-scan on household_members and budgets.

-- ─── Fix Transaction RLS policy ───────────────────────────────────────────────

drop policy if exists "Transaction household access" on public.transactions;

create policy "Transaction household access" on public.transactions
  for all using (
    household_id in (
      select household_id
      from   public.household_members
      where  user_id = auth.uid()
    )
    -- Budget subquery MUST be scoped to the same households —
    -- without this, the entire budgets table is scanned and cross-household
    -- budget_ids are accepted as long as they are 'common'/'savings'.
    and budget_id in (
      select id
      from   public.budgets
      where  household_id in (
               select household_id
               from   public.household_members
               where  user_id = auth.uid()
             )
        and (account_type in ('common', 'savings') or created_by = auth.uid())
    )
  );

-- ─── Indexes for RLS hot paths ─────────────────────────────────────────────────
-- These columns are used in every RLS subquery. Without indexes, each row
-- evaluation does a sequential scan on household_members and budgets.

-- household_members: looked up by user_id on every RLS check
create index if not exists idx_household_members_user_id
  on public.household_members (user_id);

-- budgets: looked up by household_id in category and transaction policies
create index if not exists idx_budgets_household_id
  on public.budgets (household_id);

-- categories: looked up by budget_id in the category RLS policy
create index if not exists idx_categories_budget_id
  on public.categories (budget_id);

-- transactions: looked up by budget_id in the transaction RLS policy
create index if not exists idx_transactions_budget_id
  on public.transactions (budget_id);
