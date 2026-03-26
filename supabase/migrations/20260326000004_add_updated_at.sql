-- Adds updated_at to transactions (and households/budgets/categories for consistency).
-- Required by conflict resolution in syncDown: last-write-wins based on updated_at.

alter table public.transactions
  add column if not exists updated_at timestamptz default now();

alter table public.budgets
  add column if not exists updated_at timestamptz default now();

alter table public.categories
  add column if not exists updated_at timestamptz default now();

alter table public.households
  add column if not exists updated_at timestamptz default now();

-- Auto-update updated_at on every row change

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

create trigger trg_budgets_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

create trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create trigger trg_households_updated_at
  before update on public.households
  for each row execute function public.set_updated_at();

-- Index for sync queries that filter by updated_at
create index if not exists idx_transactions_updated_at on public.transactions(updated_at);
