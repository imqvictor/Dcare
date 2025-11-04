
-- Drop the existing check constraint
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;

-- Add new check constraint that includes 'pending' status
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check 
  CHECK (status = ANY (ARRAY['paid'::text, 'unpaid'::text, 'pending'::text]));
