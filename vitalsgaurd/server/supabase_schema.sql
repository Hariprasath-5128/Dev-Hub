-- Supabase SQL Schema for VitalsGuard Auth Server

-- ==========================================
-- 1. Create the 'users' table
-- Used by the /auth route for login and signup
-- ==========================================
CREATE TABLE IF NOT EXISTS public.users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text NOT NULL UNIQUE,
  password text NOT NULL, -- Note: In a production app, this should be hashed (e.g., bcrypt)
  created_at timestamp with time zone DEFAULT now()
);

-- ==========================================
-- 2. Create the 'user_activity' table
-- Used by the /store-option route for AI interactions
-- ==========================================
CREATE TABLE IF NOT EXISTS public.user_activity (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  user_option text NOT NULL,       -- e.g., 'Generate Code', 'Modify Code'
  language text,                   -- e.g., 'Python', 'JavaScript'
  qn text,                         -- The user's prompt
  modify_code_input text,          -- The original code to be modified
  modify_code_logic text,          -- The instructions for modification
  output text,                     -- The AI's response
  created_at timestamp with time zone DEFAULT now()
);

-- ==========================================
-- 3. Row Level Security (RLS) policies
-- Optional, but recommended for security
-- ==========================================

-- Enable RLS on tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- Allow the Node.js service role to do everything
-- (The server uses the service_role key, bypassing RLS anyway,
-- but these are good to have if you ever use the anon key on the frontend)
CREATE POLICY "Enable read access for all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.users FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all activity" ON public.user_activity FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all activity" ON public.user_activity FOR INSERT WITH CHECK (true);
