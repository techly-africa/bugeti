-- Adds budget_type, account_type, status, and total_envelope to the budgets table.
-- budget_type: categorises the purpose of a budget (monthly, travel, event, etc.)
-- account_type: common (household-shared) | private (creator-only)
-- status: tracks lifecycle of a budget
-- total_envelope: optional spending cap for custom budget types (RWF)

alter table public.budgets
  add column if not exists budget_type text not null default 'monthly'
    check (budget_type in ('monthly','travel','vacation','event','project','school_year')),
  add column if not exists account_type text not null default 'common'
    check (account_type in ('common','private')),
  add column if not exists status text not null default 'active'
    check (status in ('planning','active','closed')),
  add column if not exists total_envelope integer;
