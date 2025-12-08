-- Add age tracking fields to children table
ALTER TABLE public.children
ADD COLUMN age_value integer,
ADD COLUMN age_unit text DEFAULT 'years',
ADD COLUMN age_registered_at timestamp with time zone DEFAULT now();

-- Add check constraint for valid age units
ALTER TABLE public.children
ADD CONSTRAINT valid_age_unit CHECK (age_unit IN ('months', 'years'));