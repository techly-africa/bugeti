-- Fixes 403 on household_members INSERT and 400/403 cascade on budgets/categories/transactions
-- during onboarding for brand-new users.
--
-- ROOT CAUSE
-- The "Members of same household" policy on household_members is defined FOR ALL
-- with only a USING clause. PostgreSQL uses the USING expression as WITH CHECK
-- for INSERT when no explicit WITH CHECK is given. For a brand-new user:
--
--   get_my_household_ids() → (empty set)
--
-- so the implicit WITH CHECK evaluates to false → INSERT blocked (403).
-- All downstream inserts (budgets, categories, transactions) then also fail
-- because they depend on the user having a household_members row.
--
-- FIX
-- 1. Keep the FOR ALL policy for SELECT/UPDATE/DELETE (same-household visibility).
-- 2. Add a separate FOR INSERT policy: users may only insert a row for themselves
--    (user_id = auth.uid()), preventing impersonation while unblocking onboarding.
-- 3. Replace the inline household_members subquery in "Budget insert" with
--    get_my_household_ids() so it is consistent with all other hotpath policies.

-- ─── 1. household_members — allow self-insert ─────────────────────────────────

-- Drop the catch-all policy so we can add a targeted insert policy alongside it.
drop policy if exists "Members of same household" on public.household_members;

-- Visibility: members can see all rows in households they belong to.
create policy "Members of same household" on public.household_members
  for select using (
    household_id in (select public.get_my_household_ids())
  );

-- Update/Delete: same household restriction.
create policy "Members update" on public.household_members
  for update
  using  (household_id in (select public.get_my_household_ids()))
  with check (household_id in (select public.get_my_household_ids()));

create policy "Members delete" on public.household_members
  for delete using (
    household_id in (select public.get_my_household_ids())
  );

-- Insert: authenticated users may only insert themselves.
-- This is the key fix — no membership required to join a household for the first time.
create policy "Self-join household" on public.household_members
  for insert with check (user_id = auth.uid());

-- ─── 2. budgets INSERT — use get_my_household_ids() ──────────────────────────
-- The inline subquery in _00004 was functionally correct but inconsistent;
-- aligning it with the SECURITY DEFINER helper avoids any RLS recursion risk.

drop policy if exists "Budget insert" on public.budgets;

create policy "Budget insert" on public.budgets
  for insert with check (
    household_id in (select public.get_my_household_ids())
  );
