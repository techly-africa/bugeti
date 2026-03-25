-- Adds 'savings' as a valid account_type on budgets.
-- Savings budgets represent household savings goals (Emergency Fund, Vacation, etc.).
-- They are household-visible like 'common', not restricted to the creator.

-- ─── Widen the check constraint ───────────────────────────────────────────────
-- Dynamically drop the existing unnamed constraint so this is safe regardless
-- of the auto-generated name Postgres assigned to it.

do $$
declare
  v_constraint text;
begin
  select conname into v_constraint
  from   pg_constraint
  where  conrelid = 'public.budgets'::regclass
    and  contype  = 'c'
    and  pg_get_constraintdef(oid) like '%account_type%';

  if v_constraint is not null then
    execute format('alter table public.budgets drop constraint %I', v_constraint);
  end if;
end;
$$;

alter table public.budgets
  add constraint budgets_account_type_check
  check (account_type in ('common', 'savings', 'private'));

-- ─── Update RLS policies to treat savings like common ─────────────────────────

drop policy if exists "Budget household access" on public.budgets;
create policy "Budget household access" on public.budgets
  for select using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
    and (account_type in ('common', 'savings') or created_by = auth.uid())
  );

drop policy if exists "Budget update" on public.budgets;
create policy "Budget update" on public.budgets
  for update using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
    and (account_type in ('common', 'savings') or created_by = auth.uid())
  );

drop policy if exists "Category household access" on public.categories;
create policy "Category household access" on public.categories
  for all using (
    budget_id in (
      select id from public.budgets
      where household_id in (
        select household_id from public.household_members where user_id = auth.uid()
      )
      and (account_type in ('common', 'savings') or created_by = auth.uid())
    )
  );

drop policy if exists "Transaction household access" on public.transactions;
create policy "Transaction household access" on public.transactions
  for all using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
    and budget_id in (
      select id from public.budgets
      where account_type in ('common', 'savings') or created_by = auth.uid()
    )
  );
