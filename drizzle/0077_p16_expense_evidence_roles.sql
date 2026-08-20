-- P16-05: preserve all existing expense-media links as receipt evidence while
-- allowing new records to communicate their semantic role without media bypass.
ALTER TABLE job_expense_media
  ADD COLUMN IF NOT EXISTS mediaRole ENUM('receipt', 'invoice', 'product', 'material', 'video', 'other') NOT NULL DEFAULT 'receipt';
