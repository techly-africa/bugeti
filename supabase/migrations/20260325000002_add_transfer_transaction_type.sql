-- Adds 'transfer' as a valid transaction type.
-- Transfers represent money moving between accounts (e.g. household → savings,
-- household → personal). They reduce the source envelope but are not counted
-- as expenses in P&L reporting.

do $$
declare
  v_constraint text;
begin
  select conname into v_constraint
  from   pg_constraint
  where  conrelid = 'public.transactions'::regclass
    and  contype  = 'c'
    and  pg_get_constraintdef(oid) like '%type%';

  if v_constraint is not null then
    execute format('alter table public.transactions drop constraint %I', v_constraint);
  end if;
end;
$$;

alter table public.transactions
  add constraint transactions_type_check
  check (type in ('expense', 'income', 'transfer'));
