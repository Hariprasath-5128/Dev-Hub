-- Supabase SQL Schema for VitalsGuard

-- ==========================================
-- 1. Create the 'users' table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  role text NOT NULL DEFAULT 'patient', -- 'patient', 'doctor', 'admin'
  created_at timestamp with time zone DEFAULT now()
);

-- ==========================================
-- 2. Create the 'medical_reports' table
-- Stores the results from Targeted Scans and AI Analysis
-- ==========================================
CREATE TABLE IF NOT EXISTS public.medical_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  scan_type text NOT NULL,         -- e.g., 'Targeted Scan'
  heart_rate numeric,              -- The BPM value
  spo2 numeric,                    -- The SpO2 percentage
  temperature numeric,             -- Body temp
  condition text,                  -- e.g., 'Tachycardia'
  diagnosis_summary text,          -- Detailed AI response
  confidence_score numeric,        -- AI confidence (0-100)
  created_at timestamp with time zone DEFAULT now()
);

-- ==========================================
-- 3. Security (Disable RLS temporarily for Node server access)
-- ==========================================
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_reports DISABLE ROW LEVEL SECURITY;
