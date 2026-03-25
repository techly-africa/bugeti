-- ─── UmutungoApp / Bugeti Database Schema v2 ─────────────────────────────────
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Profiles ─────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text not null,
  display_name   text not null,
  phone          text,
  avatar_url     text,
  preferred_language text default 'en' check (preferred_language in ('en', 'rw')),
  created_at     timestamptz default now()
);

-- Auto-create profile on sign up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Households ───────────────────────────────────────────────────────────────
create table if not exists households (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  invite_code text unique not null,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz default now()
);

-- ─── Household Members ────────────────────────────────────────────────────────
create table if not exists household_members (
  id           uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  role         text not null default 'member' check (role in ('owner', 'member', 'viewer')),
  display_name text not null,
  joined_at    timestamptz default now(),
  unique (household_id, user_id)
);

-- ─── Budgets ──────────────────────────────────────────────────────────────────
-- budget_type: monthly (standard) | travel | vacation | event | project | school_year
-- account_type: common (shared household) | savings (household savings goals) | private (personal, owner-only)
-- status: planning | active | closed
create table if not exists budgets (
  id             uuid primary key default uuid_generate_v4(),
  household_id   uuid not null references households(id) on delete cascade,
  name           text not null,
  period         text not null default 'monthly' check (period in ('monthly', 'weekly')),
  budget_type    text not null default 'monthly'
                   check (budget_type in ('monthly','travel','vacation','event','project','school_year')),
  account_type   text not null default 'common'
                   check (account_type in ('common', 'savings', 'private')),
  status         text not null default 'active'
                   check (status in ('planning', 'active', 'closed')),
  total_envelope integer,       -- optional cap for custom budget types (RWF)
  start_date     date not null,
  end_date       date not null,
  currency       text not null default 'RWF',
  created_by     uuid references profiles(id) on delete set null,
  created_at     timestamptz default now()
);

-- ─── Categories ───────────────────────────────────────────────────────────────
-- parent_id: null = top-level category, set = sub-budget item (max 3 levels)
create table if not exists categories (
  id             uuid primary key default uuid_generate_v4(),
  budget_id      uuid not null references budgets(id) on delete cascade,
  parent_id      uuid references categories(id) on delete cascade,
  level          integer not null default 0 check (level between 0 and 2),
  name           text not null,
  name_rw        text,
  planned_amount integer not null default 0,
  icon           text not null default '📦',
  color          text not null default '#6b7280',
  sort_order     integer not null default 0
);

-- ─── Transactions ─────────────────────────────────────────────────────────────
-- payment_method: MTN MoMo | Airtel Money | Bank Transfer | Cash
create table if not exists transactions (
  id             uuid primary key default uuid_generate_v4(),
  category_id    uuid references categories(id) on delete set null,
  budget_id      uuid not null references budgets(id) on delete cascade,
  household_id   uuid not null references households(id) on delete cascade,
  added_by       uuid references profiles(id) on delete set null,
  type           text not null check (type in ('expense', 'income', 'transfer')),
  amount         integer not null check (amount > 0),
  note           text default '',
  date           date not null,
  payment_method text not null default 'cash'
                   check (payment_method in ('mtn_momo','airtel_money','bank_transfer','cash')),
  receipt_url    text,
  ocr_raw        text,
  synced         boolean default true,
  created_at     timestamptz default now()
);

-- ─── Ikimina (Group Savings Circles) ──────────────────────────────────────────
-- Traditional Rwandan rotating savings groups
create table if not exists ikimina (
  id                  uuid primary key default uuid_generate_v4(),
  household_id        uuid not null references households(id) on delete cascade,
  name                text not null,
  name_rw             text,
  total_members       integer not null default 1,
  contribution_amount integer not null default 0, -- RWF per cycle
  cycle               text not null default 'monthly' check (cycle in ('weekly', 'monthly')),
  start_date          date not null,
  status              text not null default 'active'
                        check (status in ('active', 'completed', 'paused')),
  created_by          uuid references profiles(id) on delete set null,
  created_at          timestamptz default now()
);

create table if not exists ikimina_contributions (
  id             uuid primary key default uuid_generate_v4(),
  ikimina_id     uuid not null references ikimina(id) on delete cascade,
  member_name    text not null,
  amount         integer not null check (amount > 0),
  date           date not null,
  cycle_number   integer not null default 1,
  payment_method text not null default 'cash'
                   check (payment_method in ('mtn_momo','airtel_money','bank_transfer','cash')),
  note           text,
  created_at     timestamptz default now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table profiles enable row level security;
alter table households enable row level security;
alter table household_members enable row level security;
alter table budgets enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;
alter table ikimina enable row level security;
alter table ikimina_contributions enable row level security;

-- Profiles: users see and update their own profile only
create policy "Own profile" on profiles
  for all using (auth.uid() = id);

-- Households: members can read; owners can create
create policy "Household members read" on households
  for select using (
    id in (select household_id from household_members where user_id = auth.uid())
  );

create policy "Household owner write" on households
  for insert with check (created_by = auth.uid());

create policy "Household owner update" on households
  for update using (created_by = auth.uid());

-- Members: same household
create policy "Members of same household" on household_members
  for all using (
    household_id in (select household_id from household_members where user_id = auth.uid())
  );

-- Budgets: household members can read all; private budgets only readable by creator
create policy "Budget household access" on budgets
  for select using (
    household_id in (select household_id from household_members where user_id = auth.uid())
    and (account_type in ('common', 'savings') or created_by = auth.uid())
  );

create policy "Budget insert" on budgets
  for insert with check (
    household_id in (select household_id from household_members where user_id = auth.uid())
  );

create policy "Budget update" on budgets
  for update using (
    household_id in (select household_id from household_members where user_id = auth.uid())
    and (account_type in ('common', 'savings') or created_by = auth.uid())
  );

create policy "Budget delete" on budgets
  for delete using (created_by = auth.uid());

-- Categories: follow budget access rules (respects private budget RLS via budget_id)
create policy "Category household access" on categories
  for all using (
    budget_id in (
      select id from budgets
      where household_id in (select household_id from household_members where user_id = auth.uid())
        and (account_type in ('common', 'savings') or created_by = auth.uid())
    )
  );

-- Transactions: same budget access rules
create policy "Transaction household access" on transactions
  for all using (
    household_id in (select household_id from household_members where user_id = auth.uid())
    and budget_id in (
      select id from budgets
      where account_type in ('common', 'savings') or created_by = auth.uid()
    )
  );

-- Ikimina: household members
create policy "Ikimina household access" on ikimina
  for all using (
    household_id in (select household_id from household_members where user_id = auth.uid())
  );

create policy "Ikimina contributions access" on ikimina_contributions
  for all using (
    ikimina_id in (
      select id from ikimina
      where household_id in (select household_id from household_members where user_id = auth.uid())
    )
  );

-- ─── Storage: Receipt bucket ──────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('bugeti-receipts', 'bugeti-receipts', false)
on conflict do nothing;

create policy "Receipts upload" on storage.objects
  for insert with check (
    bucket_id = 'bugeti-receipts' and
    auth.uid()::text = (storage.foldername(name))[2]
  );

create policy "Receipts read own" on storage.objects
  for select using (
    bucket_id = 'bugeti-receipts' and
    auth.uid()::text = (storage.foldername(name))[2]
  );

-- ─── Helpful Views ────────────────────────────────────────────────────────────

-- Budget summary view: revenue, total spent, savings per budget
create or replace view budget_summaries as
select
  b.id as budget_id,
  b.name,
  b.budget_type,
  b.account_type,
  b.status,
  b.start_date,
  b.end_date,
  coalesce(sum(case when t.type = 'income'  then t.amount else 0 end), 0) as total_revenue,
  coalesce(sum(case when t.type = 'expense' then t.amount else 0 end), 0) as total_spent,
  coalesce(sum(case when t.type = 'income'  then t.amount else 0 end), 0) -
  coalesce(sum(case when t.type = 'expense' then t.amount else 0 end), 0) as savings,
  coalesce(sum(c.planned_amount) filter (where c.parent_id is null), 0) as total_planned
from budgets b
left join transactions t on t.budget_id = b.id
left join categories c on c.budget_id = b.id
group by b.id, b.name, b.budget_type, b.account_type, b.status, b.start_date, b.end_date;

-- Category drill-down: planned vs actual for each category + sub-categories
create or replace view category_stats as
select
  c.id,
  c.budget_id,
  c.parent_id,
  c.level,
  c.name,
  c.name_rw,
  c.planned_amount,
  c.icon,
  c.color,
  c.sort_order,
  coalesce(sum(t.amount) filter (where t.type = 'expense'), 0) as spent,
  c.planned_amount - coalesce(sum(t.amount) filter (where t.type = 'expense'), 0) as remaining,
  case
    when c.planned_amount = 0 then 0
    else round(
      coalesce(sum(t.amount) filter (where t.type = 'expense'), 0)::numeric
      / c.planned_amount * 100, 1
    )
  end as percentage_used
from categories c
left join transactions t on t.category_id = c.id
group by c.id, c.budget_id, c.parent_id, c.level, c.name, c.name_rw,
         c.planned_amount, c.icon, c.color, c.sort_order;
