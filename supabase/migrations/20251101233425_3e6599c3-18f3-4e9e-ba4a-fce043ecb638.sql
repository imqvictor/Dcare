-- Add payment_amount column to children table
ALTER TABLE public.children 
ADD COLUMN payment_amount numeric NOT NULL DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.children.payment_amount IS 'Default payment amount for this child in KSH';