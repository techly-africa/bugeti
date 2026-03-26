-- Multi-tenancy guardrails: closes all remaining household isolation gaps.
--
-- GAPS FIXED
-- 1. Views declared SECURITY INVOKER explicitly (prevents RLS bypass if ever
--    altered to SECURITY DEFINER in the future).
-- 2. Viewer role enforced: role='viewer' members can SELECT but never write.
-- 3. Owner-only operations: rename household, manage members, delete shared budgets.
-- 4. households DELETE policy (was missing entirely).
-- 5. household_members DELETE tightened: owner removes anyone; member removes self.
-- 6. Ikimina policies migrated to get_my_household_ids() + WITH CHECK on INSERT.
-- 7. Transaction household_id consistency enforced via trigger (can't be bypassed
--    by RLS tricks — a transaction can't claim household A while its budget
--    belongs to household B).
-- 8. Budget INSERT/UPDATE/DELETE tightened with viewer block + owner restriction
--    on shared budgets.
-- 9. Category INSERT/UPDATE/DELETE viewer block added.

-- ─── 1. Role-check helper ─────────────────────────────────────────────────────
-- Returns current user's role in a given household, NULL if not a member.
-- SECURITY DEFINER so it bypasses RLS on household_members without recursion.

create or replace function public.get_my_role_in_household(p_household_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role
  from   public.household_members
  where  household_id = p_household_id
    and  user_id      = auth.uid()
  limit 1;
$$;

revoke execute on function public.get_my_role_in_household(uuid) from public;
grant  execute on function public.get_my_role_in_household(uuid) to authenticated;

-- ─── 2. Views: explicit SECURITY INVOKER ──────────────────────────────────────
-- RLS on the underlying tables IS evaluated for the calling user (PostgreSQL
-- views are SECURITY INVOKER by default), but making it explicit guards against
-- accidental regression if a future migration recreates a view as DEFINER.

alter view public.budget_summaries set (security_invoker = on);
alter view public.category_stats   set (security_invoker = on);

-- ─── 3. Households ────────────────────────────────────────────────────────────

-- 3a. UPDATE: owner only; WITH CHECK prevents owner from transferring ownership
--     or changing household_id.
drop policy if exists "Household owner update" on public.households;
create policy "Household owner update" on public.households
  for update
  using  (public.get_my_role_in_household(id) = 'owner')
  with check (public.get_my_role_in_household(id) = 'owner');

-- 3b. DELETE: owner only (this policy was entirely missing before).
drop policy if exists "Household owner delete" on public.households;
create policy "Household owner delete" on public.households
  for delete using (public.get_my_role_in_household(id) = 'owner');

-- ─── 4. Household members ─────────────────────────────────────────────────────

-- 4a. UPDATE: owner only (changing roles, display names, etc.)
--     Split from the old FOR ALL policy in _00008.
drop policy if exists "Members update" on public.household_members;
create policy "Members update" on public.household_members
  for update
  using (public.get_my_role_in_household(household_id) = 'owner')
  with check (public.get_my_role_in_household(household_id) = 'owner');

-- 4b. DELETE: owner removes anyone in their household;
--     member/viewer can only remove themselves (leave the household).
drop policy if exists "Members delete" on public.household_members;
create policy "Members delete" on public.household_members
  for delete using (
    public.get_my_role_in_household(household_id) = 'owner'
    or user_id = auth.uid()
  );

-- ─── 5. Budgets ───────────────────────────────────────────────────────────────

-- 5a. INSERT: any non-viewer household member can create budgets.
drop policy if exists "Budget insert" on public.budgets;
create policy "Budget insert" on public.budgets
  for insert with check (
    household_id in (select public.get_my_household_ids())
    and public.get_my_role_in_household(household_id) != 'viewer'
  );

-- 5b. UPDATE: non-viewer members for common/savings; creator only for private.
drop policy if exists "Budget update" on public.budgets;
create policy "Budget update" on public.budgets
  for update
  using (
    household_id in (select public.get_my_household_ids())
    and (account_type in ('common', 'savings') or created_by = auth.uid())
    and public.get_my_role_in_household(household_id) != 'viewer'
  )
  with check (
    household_id in (select public.get_my_household_ids())
    and public.get_my_role_in_household(household_id) != 'viewer'
  );

-- 5c. DELETE: owner for shared (common/savings) budgets; creator for private.
--     Previously any creator could delete, even non-owner members.
drop policy if exists "Budget delete" on public.budgets;
create policy "Budget delete" on public.budgets
  for delete using (
    household_id in (select public.get_my_household_ids())
    and (
      -- owners can delete any shared budget
      (account_type in ('common', 'savings')
        and public.get_my_role_in_household(household_id) = 'owner')
      -- anyone can delete their own private budget
      or (account_type = 'private' and created_by = auth.uid())
    )
  );

-- ─── 6. Categories ────────────────────────────────────────────────────────────
-- Add viewer block to INSERT/UPDATE/DELETE.
-- The budget_id→household lookup is needed to check the role.

-- Helper CTE used inline: given a budget_id, return its household_id.
-- We avoid a separate function; the subquery is tiny (1 row lookup).

drop policy if exists "Category insert" on public.categories;
create policy "Category insert" on public.categories
  for insert with check (
    budget_id in (
      select b.id from public.budgets b
      where  b.household_id in (select public.get_my_household_ids())
        and  (b.account_type in ('common', 'savings') or b.created_by = auth.uid())
        and  public.get_my_role_in_household(b.household_id) != 'viewer'
    )
  );

drop policy if exists "Category update" on public.categories;
create policy "Category update" on public.categories
  for update
  using (
    budget_id in (
      select b.id from public.budgets b
      where  b.household_id in (select public.get_my_household_ids())
        and  (b.account_type in ('common', 'savings') or b.created_by = auth.uid())
        and  public.get_my_role_in_household(b.household_id) != 'viewer'
    )
  )
  with check (
    budget_id in (
      select b.id from public.budgets b
      where  b.household_id in (select public.get_my_household_ids())
        and  public.get_my_role_in_household(b.household_id) != 'viewer'
    )
  );

drop policy if exists "Category delete" on public.categories;
create policy "Category delete" on public.categories
  for delete using (
    budget_id in (
      select b.id from public.budgets b
      where  b.household_id in (select public.get_my_household_ids())
        and  (b.account_type in ('common', 'savings') or b.created_by = auth.uid())
        and  public.get_my_role_in_household(b.household_id) != 'viewer'
    )
  );

-- ─── 7. Transactions ──────────────────────────────────────────────────────────

-- 7a. INSERT: non-viewer members only.
drop policy if exists "Transaction insert" on public.transactions;
create policy "Transaction insert" on public.transactions
  for insert with check (
    household_id in (select public.get_my_household_ids())
    and budget_id in (
      select b.id from public.budgets b
      where  b.household_id in (select public.get_my_household_ids())
        and  (b.account_type in ('common', 'savings') or b.created_by = auth.uid())
    )
    and public.get_my_role_in_household(household_id) != 'viewer'
  );

-- 7b. UPDATE: non-viewer members only.
drop policy if exists "Transaction update" on public.transactions;
create policy "Transaction update" on public.transactions
  for update
  using (
    household_id in (select public.get_my_household_ids())
    and budget_id in (
      select b.id from public.budgets b
      where  b.household_id in (select public.get_my_household_ids())
        and  (b.account_type in ('common', 'savings') or b.created_by = auth.uid())
    )
    and public.get_my_role_in_household(household_id) != 'viewer'
  )
  with check (
    household_id in (select public.get_my_household_ids())
    and public.get_my_role_in_household(household_id) != 'viewer'
  );

-- 7c. DELETE unchanged: only the transaction's creator can delete it.

-- ─── 8. Ikimina — migrate to get_my_household_ids() + WITH CHECK ──────────────

drop policy if exists "Ikimina household access" on public.ikimina;
drop policy if exists "Ikimina select" on public.ikimina;
drop policy if exists "Ikimina insert" on public.ikimina;
drop policy if exists "Ikimina update" on public.ikimina;
drop policy if exists "Ikimina delete" on public.ikimina;

create policy "Ikimina select" on public.ikimina
  for select using (
    household_id in (select public.get_my_household_ids())
  );

create policy "Ikimina insert" on public.ikimina
  for insert with check (
    household_id in (select public.get_my_household_ids())
    and public.get_my_role_in_household(household_id) != 'viewer'
  );

create policy "Ikimina update" on public.ikimina
  for update
  using (
    household_id in (select public.get_my_household_ids())
    and public.get_my_role_in_household(household_id) != 'viewer'
  )
  with check (
    household_id in (select public.get_my_household_ids())
    and public.get_my_role_in_household(household_id) != 'viewer'
  );

create policy "Ikimina delete" on public.ikimina
  for delete using (
    household_id in (select public.get_my_household_ids())
    and public.get_my_role_in_household(household_id) != 'viewer'
  );

-- Ikimina contributions: use get_my_household_ids() via ikimina join

drop policy if exists "Ikimina contributions access" on public.ikimina_contributions;
drop policy if exists "Ikimina contributions select" on public.ikimina_contributions;
drop policy if exists "Ikimina contributions insert" on public.ikimina_contributions;
drop policy if exists "Ikimina contributions update" on public.ikimina_contributions;
drop policy if exists "Ikimina contributions delete" on public.ikimina_contributions;

create policy "Ikimina contributions select" on public.ikimina_contributions
  for select using (
    ikimina_id in (
      select id from public.ikimina
      where  household_id in (select public.get_my_household_ids())
    )
  );

create policy "Ikimina contributions insert" on public.ikimina_contributions
  for insert with check (
    ikimina_id in (
      select i.id from public.ikimina i
      where  i.household_id in (select public.get_my_household_ids())
        and  public.get_my_role_in_household(i.household_id) != 'viewer'
    )
  );

create policy "Ikimina contributions update" on public.ikimina_contributions
  for update
  using (
    ikimina_id in (
      select i.id from public.ikimina i
      where  i.household_id in (select public.get_my_household_ids())
        and  public.get_my_role_in_household(i.household_id) != 'viewer'
    )
  )
  with check (
    ikimina_id in (
      select i.id from public.ikimina i
      where  i.household_id in (select public.get_my_household_ids())
        and  public.get_my_role_in_household(i.household_id) != 'viewer'
    )
  );

create policy "Ikimina contributions delete" on public.ikimina_contributions
  for delete using (
    ikimina_id in (
      select i.id from public.ikimina i
      where  i.household_id in (select public.get_my_household_ids())
        and  public.get_my_role_in_household(i.household_id) != 'viewer'
    )
  );

-- ─── 9. Transaction household_id consistency trigger ──────────────────────────
-- Ensures transaction.household_id always equals its budget's household_id.
-- This cannot be bypassed by crafting a malicious payload — it runs at the DB
-- level before RLS policies even commit the row.

create or replace function public.enforce_transaction_household_consistency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_budget_household_id uuid;
begin
  select household_id into v_budget_household_id
  from   public.budgets
  where  id = new.budget_id;

  if v_budget_household_id is null then
    raise exception 'budget_id % does not exist', new.budget_id;
  end if;

  if new.household_id != v_budget_household_id then
    raise exception
      'transaction.household_id (%) must match budget.household_id (%)',
      new.household_id, v_budget_household_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_transaction_household_consistency on public.transactions;
create trigger trg_transaction_household_consistency
  before insert or update on public.transactions
  for each row execute function public.enforce_transaction_household_consistency();
