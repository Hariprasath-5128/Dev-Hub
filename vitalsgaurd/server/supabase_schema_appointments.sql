-- Supabase SQL Schema for VitalsGuard appointment booking
-- Replaces the in-memory appointmentsStore array in server.js — without this,
-- every appointment is lost on every Node server restart.

CREATE TABLE IF NOT EXISTS public.appointments (
  id text PRIMARY KEY,
  patient_id text NOT NULL,
  username text,
  doctor_id text NOT NULL,
  doctor_name text NOT NULL,
  specialty text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 20,
  status text NOT NULL DEFAULT 'booked',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments (patient_id, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON public.appointments (doctor_id, start_time);

ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;
