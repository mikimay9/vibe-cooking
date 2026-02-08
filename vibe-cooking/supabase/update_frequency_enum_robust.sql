DO $$
BEGIN
    -- Check for 'quarterly'
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'quarterly' AND enumtypid = 'frequency_type'::regtype) THEN
        ALTER TYPE frequency_type ADD VALUE 'quarterly';
    END IF;

    -- Check for 'none'
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'none' AND enumtypid = 'frequency_type'::regtype) THEN
        ALTER TYPE frequency_type ADD VALUE 'none';
    END IF;
END $$;
