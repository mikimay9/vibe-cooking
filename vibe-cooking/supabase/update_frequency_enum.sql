-- Add new values to the enum
-- Note: PostgreSQL does not support IF NOT EXISTS for enum values directly in a single command easily without a block,
-- but standard ALTER TYPE ADD VALUE helps. If it already exists, it might throw an error, so run these one by one or ignore if already added.

ALTER TYPE frequency_type ADD VALUE 'quarterly';
ALTER TYPE frequency_type ADD VALUE 'none';
