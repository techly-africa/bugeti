-- Adds payment_method to transactions.
-- Tracks how a transaction was paid: MTN MoMo, Airtel Money, bank transfer, or cash.

alter table public.transactions
  add column if not exists payment_method text not null default 'cash'
    check (payment_method in ('mtn_momo','airtel_money','bank_transfer','cash'));
