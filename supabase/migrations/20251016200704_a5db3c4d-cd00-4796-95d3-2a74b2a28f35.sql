-- Add attendance tracking and debt management to payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS attendance_status text CHECK (attendance_status IN ('present', 'absent', 'pending')),
ADD COLUMN IF NOT EXISTS arrival_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS debt_amount numeric DEFAULT 0;

-- Update existing records to have attendance_status
UPDATE public.payments
SET attendance_status = 'pending'
WHERE attendance_status IS NULL;

-- Add index for faster queries on payment_date (only if doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_payments_date') THEN
        CREATE INDEX idx_payments_date ON public.payments(payment_date DESC);
    END IF;
END $$;

-- Add class field to children table
ALTER TABLE public.children
ADD COLUMN IF NOT EXISTS class text,
ADD COLUMN IF NOT EXISTS admission_number text;

-- Add unique constraint only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'children_admission_number_key') THEN
        ALTER TABLE public.children ADD CONSTRAINT children_admission_number_key UNIQUE (admission_number);
    END IF;
END $$;