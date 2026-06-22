-- 0041_credit_limit.sql
-- Adds credit_limit to contacts and stock_qty to products select (already exists).
-- credit_limit: optional cap on outstanding balance for this customer.

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS credit_limit numeric(12,2) DEFAULT NULL;
