-- Creates budget_summaries and category_stats views for reporting.
-- budget_summaries: revenue, total spent, savings, and planned amount per budget.
-- category_stats: planned vs actual spending with percentage used per category.

create or replace view public.budget_summaries as
select
  b.id          as budget_id,
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
from public.budgets b
left join public.transactions t on t.budget_id = b.id
left join public.categories   c on c.budget_id = b.id
group by b.id, b.name, b.budget_type, b.account_type, b.status, b.start_date, b.end_date;

create or replace view public.category_stats as
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
  c.planned_amount
    - coalesce(sum(t.amount) filter (where t.type = 'expense'), 0) as remaining,
  case
    when c.planned_amount = 0 then 0
    else round(
      coalesce(sum(t.amount) filter (where t.type = 'expense'), 0)::numeric
      / c.planned_amount * 100, 1
    )
  end as percentage_used
from public.categories c
left join public.transactions t on t.category_id = c.id
group by c.id, c.budget_id, c.parent_id, c.level, c.name, c.name_rw,
         c.planned_amount, c.icon, c.color, c.sort_order;
