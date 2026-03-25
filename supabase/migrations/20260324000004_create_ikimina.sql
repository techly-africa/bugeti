-- Creates the ikimina and ikimina_contributions tables.
-- Ikimina: traditional Rwandan rotating savings circles (tontines).
-- Each ikimina belongs to a household; contributions are recorded per cycle.

create table if not exists public.ikimina (
  id                  uuid primary key default uuid_generate_v4(),
  household_id        uuid not null references public.households(id) on delete cascade,
  name                text not null,
  name_rw             text,
  total_members       integer not null default 1,
  contribution_amount integer not null default 0,
  cycle               text not null default 'monthly'
                        check (cycle in ('weekly','monthly')),
  start_date          date not null,
  status              text not null default 'active'
                        check (status in ('active','completed','paused')),
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz default now()
);

create table if not exists public.ikimina_contributions (
  id             uuid primary key default uuid_generate_v4(),
  ikimina_id     uuid not null references public.ikimina(id) on delete cascade,
  member_name    text not null,
  amount         integer not null check (amount > 0),
  date           date not null,
  cycle_number   integer not null default 1,
  payment_method text not null default 'cash'
                   check (payment_method in ('mtn_momo','airtel_money','bank_transfer','cash')),
  note           text,
  created_at     timestamptz default now()
);
