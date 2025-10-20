/*
  # Mama Care Daycare Management System - Complete Database Setup

  ## Overview
  This migration sets up the complete database structure for the Mama Care daycare management system with personalized child fees, attendance tracking, payment management, and daily refresh capabilities.

  ## New Tables
  
  ### 1. `children` table
  Stores all registered children with their guardian information and personalized fee structure
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text) - Child's full name
  - `age` (integer) - Child's age
  - `guardian_name` (text) - Guardian's name
  - `contact_number` (text) - Contact phone number
  - `admission_date` (date) - Date of admission
  - `class` (text, nullable) - Class/group assignment
  - `admission_number` (text, nullable, unique) - Unique admission number
  - `amount_charged` (numeric) - Personalized daily fee in KES (default 150)
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### 2. `payments` table
  Tracks all payment and attendance records with debt management
  - `id` (uuid, primary key) - Unique identifier
  - `child_id` (uuid, foreign key) - References children table
  - `amount` (numeric) - Payment amount
  - `payment_date` (date) - Date of payment/attendance
  - `status` (text) - Payment status: 'paid' or 'unpaid'
  - `note` (text, nullable) - Additional notes
  - `attendance_status` (text) - 'present', 'absent', or 'pending'
  - `arrival_time` (timestamptz, nullable) - Time child arrived
  - `debt_amount` (numeric) - Outstanding debt amount
  - `created_at` (timestamptz) - Record creation timestamp
  - `can_undo` (boolean) - Flag to track if record can be undone (today only)
  
  ### 3. `daily_records` table
  Tracks which children have been processed today (for button state management)
  - `id` (uuid, primary key) - Unique identifier
  - `child_id` (uuid, foreign key) - References children table
  - `record_date` (date) - Date of record
  - `attendance_marked` (boolean) - Whether attendance has been marked
  - `payment_marked` (boolean) - Whether payment has been marked
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  All tables have Row Level Security (RLS) enabled with policies for authenticated users only.
  
  ## Important Notes
  1. Each child has a personalized `amount_charged` field (default 150 KES)
  2. Daily records auto-refresh at midnight via client-side logic
  3. Undo functionality only works for today's records
  4. Payment history is permanent and never deleted by auto-refresh
  5. Attendance and payment buttons are one-time-use per day per child
*/

-- Create children table
CREATE TABLE IF NOT EXISTS public.children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  age integer NOT NULL CHECK (age >= 1 AND age <= 17),
  guardian_name text NOT NULL,
  contact_number text NOT NULL,
  admission_date date NOT NULL DEFAULT CURRENT_DATE,
  class text,
  admission_number text,
  amount_charged numeric NOT NULL DEFAULT 150,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique constraint on admission_number if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'children_admission_number_key') THEN
    ALTER TABLE public.children ADD CONSTRAINT children_admission_number_key UNIQUE (admission_number);
  END IF;
END $$;

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL CHECK (status IN ('paid', 'unpaid')) DEFAULT 'unpaid',
  note text,
  attendance_status text CHECK (attendance_status IN ('present', 'absent', 'pending')) DEFAULT 'pending',
  arrival_time timestamptz,
  debt_amount numeric DEFAULT 0,
  can_undo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create daily_records table for tracking today's button states
CREATE TABLE IF NOT EXISTS public.daily_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  record_date date NOT NULL DEFAULT CURRENT_DATE,
  attendance_marked boolean DEFAULT false,
  payment_marked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(child_id, record_date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_child_id ON public.payments(child_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_daily_records_date ON public.daily_records(record_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_records_child ON public.daily_records(child_id, record_date);

-- Enable Row Level Security
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for children table
CREATE POLICY "Authenticated users can view all children"
  ON public.children FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert children"
  ON public.children FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update children"
  ON public.children FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete children"
  ON public.children FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for payments table
CREATE POLICY "Authenticated users can view all payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update payments"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete payments"
  ON public.payments FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for daily_records table
CREATE POLICY "Authenticated users can view all daily records"
  ON public.daily_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert daily records"
  ON public.daily_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update daily records"
  ON public.daily_records FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete daily records"
  ON public.daily_records FOR DELETE
  TO authenticated
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on children table
DROP TRIGGER IF EXISTS update_children_updated_at ON public.children;
CREATE TRIGGER update_children_updated_at
  BEFORE UPDATE ON public.children
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();