-- Supabase SQL Schema for the VitalsGuard 8-agent pipeline (Python backend)
-- Optional: only needed if you want real persistence instead of the
-- in-memory simulated data store. Once SUPABASE_URL and
-- SUPABASE_SERVICE_ROLE_KEY are set in vitalsgaurd/backend/.env, the
-- backend automatically reads/writes these tables instead of simulating.

-- ==========================================
-- 1. patient_profiles — used by get_patient_profile()
-- ==========================================
CREATE TABLE IF NOT EXISTS public.patient_profiles (
  patient_id text PRIMARY KEY,
  name text,
  age integer,
  sex text,
  known_conditions jsonb DEFAULT '[]',
  allergies jsonb DEFAULT '[]',
  medications jsonb DEFAULT '[]',
  mobility_limited boolean DEFAULT false,
  baseline_vitals jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- ==========================================
-- 2. vitals_history — used by get_latest_vitals(), get_vital_history()
-- ==========================================
CREATE TABLE IF NOT EXISTS public.vitals_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id text NOT NULL,
  heart_rate numeric,
  spo2 numeric,
  temperature numeric,
  systolic_bp numeric,
  diastolic_bp numeric,
  respiratory_rate numeric,
  ecg_irregularity numeric,
  timestamp double precision NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vitals_history_patient ON public.vitals_history (patient_id, timestamp DESC);

-- ==========================================
-- 3. analyses_history — used by get_previous_analysis(), get_patient_history()
-- ==========================================
CREATE TABLE IF NOT EXISTS public.analyses_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id text NOT NULL,
  consensus text,
  ews_level text,
  patterns jsonb DEFAULT '[]',
  actions jsonb DEFAULT '[]',
  timestamp double precision NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analyses_history_patient ON public.analyses_history (patient_id, timestamp DESC);

-- ==========================================
-- 4. medical_reports_agent — used by get_reports()
--    (kept separate from server/supabase_schema_medical.sql's medical_reports
--     table, which is written by the Node auth server for a different flow)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.medical_reports_agent (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id text NOT NULL,
  report_type text,
  extracted_text text,
  lab_values jsonb DEFAULT '{}',
  correlation_score integer,
  timestamp double precision NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_medical_reports_agent_patient ON public.medical_reports_agent (patient_id, timestamp DESC);

-- ==========================================
-- 5. doctor_contacts — used by get_doctor_contacts()
-- ==========================================
CREATE TABLE IF NOT EXISTS public.doctor_contacts (
  id text PRIMARY KEY,
  name text NOT NULL,
  specialty text NOT NULL,
  phone text,
  email text
);

-- ==========================================
-- 6. emergency_events — used by create_emergency_event()
-- ==========================================
CREATE TABLE IF NOT EXISTS public.emergency_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id text NOT NULL,
  ews_level text,
  consensus text,
  vitals jsonb DEFAULT '{}',
  dispatched boolean DEFAULT false,
  created_at double precision NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_emergency_events_patient ON public.emergency_events (patient_id, created_at DESC);

-- ==========================================
-- 7. Security — service role key bypasses RLS; disable for simplicity
--    (matches the pattern used in supabase_schema_medical.sql)
-- ==========================================
ALTER TABLE public.patient_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vitals_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_reports_agent DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_events DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- 8. Seed data — same demo doctors/patient the app uses when running on
--    the in-memory simulated store, so behaviour is unchanged after you
--    switch to real Supabase. Safe to edit/delete once you have real data.
-- ==========================================
INSERT INTO public.doctor_contacts (id, name, specialty, phone, email) VALUES
  ('d1', 'Dr. Sarah Chen', 'Cardiologist', '+1-555-0101', 's.chen@vitalsguard.demo'),
  ('d2', 'Dr. Rajesh Kumar', 'Neurologist', '+1-555-0102', 'r.kumar@vitalsguard.demo'),
  ('d3', 'Dr. Lisa Wong', 'Pulmonologist', '+1-555-0103', 'l.wong@vitalsguard.demo')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.patient_profiles (patient_id, name, age, sex, known_conditions, allergies, medications, mobility_limited, baseline_vitals) VALUES
  ('demo-patient', 'Demo Patient', 42, 'unspecified',
   '["hypertension"]', '["penicillin"]', '["lisinopril 10mg"]', false,
   '{"heart_rate": 72, "spo2": 98, "temperature": 36.7, "systolic_bp": 122, "diastolic_bp": 80, "respiratory_rate": 16}')
ON CONFLICT (patient_id) DO NOTHING;

-- Real profile for the demo `patient1` login account (see
-- supabase_schema_medical.sql), keyed to their actual Supabase user id —
-- this is the row RBAC-enforced requests will actually resolve to once
-- patient1 logs in for real, since patient_id = the authenticated user's id.
INSERT INTO public.patient_profiles (patient_id, name, age, sex, known_conditions, allergies, medications, mobility_limited, baseline_vitals)
SELECT id::text, 'Patient One', 42, 'unspecified', '["hypertension"]', '["penicillin"]', '["lisinopril 10mg"]', false,
       '{"heart_rate": 72, "spo2": 98, "temperature": 36.7, "systolic_bp": 122, "diastolic_bp": 80, "respiratory_rate": 16}'
FROM public.users WHERE username = 'patient1'
ON CONFLICT (patient_id) DO NOTHING;
