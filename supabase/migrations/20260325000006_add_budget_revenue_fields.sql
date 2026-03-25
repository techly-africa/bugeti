-- Add revenue fields to budgets table
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS revenue_source TEXT;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS revenue_duration TEXT;
