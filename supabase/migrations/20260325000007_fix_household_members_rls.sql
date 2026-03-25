-- Fixes infinite-recursion 500 errors on household_members and budgets queries.
--
-- ROOT CAUSE
-- The original "Members of same household" policy was self-referential:
--
--   for all using (
--     household_id in (
--       select household_id from household_members where user_id = auth.uid()
--     )
--   );
--
-- PostgreSQL evaluates that sub-select, which triggers the same RLS policy,
-- which triggers the sub-select again → infinite recursion → HTTP 500.
--
-- The "Household members read" policy on households had the same issue —
-- it queried household_members inline, triggering the recursive policy above.
--
-- FIX
-- Replace both self-referential patterns with get_my_household_ids(), a
-- SECURITY DEFINER function defined in 20260325000005. Because it runs as
-- its owner (bypassing RLS), it reads household_members without triggering
-- the policy, breaking the recursion.

-- ─── Ensure the helper function exists (idempotent) ───────────────────────────
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

revoke execute on function public.get_my_household_ids() from public;
grant  execute on function public.get_my_household_ids() to authenticated;

-- ─── Fix: household_members ───────────────────────────────────────────────────
drop policy if exists "Members of same household" on public.household_members;

create policy "Members of same household" on public.household_members
  for all using (
    household_id in (select public.get_my_household_ids())
  );

-- ─── Fix: households ─────────────────────────────────────────────────────────
-- "Household members read" queried household_members inline, which triggered
-- the old recursive policy and caused the same 500 on household queries.
drop policy if exists "Household members read" on public.households;

create policy "Household members read" on public.households
  for select using (
    id in (select public.get_my_household_ids())
  );
