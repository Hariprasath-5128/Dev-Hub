# Supabase Authentication Setup Guide

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project and wait for it to initialize
3. Once ready, navigate to **Settings → API**

## Step 2: Get Your Credentials

From the API page, copy:
- **Project URL** - This is your `VITE_SUPABASE_URL`
- **anon/public key** - This is your `VITE_SUPABASE_ANON_KEY`

## Step 3: Create .env File

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 4: Enable Email/Password Authentication

1. In Supabase Dashboard, go to **Authentication → Providers**
2. Make sure **Email** provider is enabled
3. Go to **Authentication → Policies** to configure password rules if needed

## Step 5: Create Users Table (Optional but Recommended)

To track user roles and additional metadata, create a table in your Supabase database:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'patient' CHECK (role IN ('admin', 'doctor', 'patient')),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own data
CREATE POLICY "Users can read their own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Allow users to update their own data
CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);
```

## Step 6: Run the App

```bash
npm run dev
```

## Features Implemented

✅ **Sign Up** - Create new accounts with email/password
✅ **Login** - Authenticate with Supabase
✅ **Session Persistence** - Automatic login on page refresh
✅ **Role-based Routing** - Different dashboards for admin, doctor, patient
✅ **Logout** - Sign out and clear session
✅ **Error Handling** - Display authentication errors to users

## Testing Credentials

You can create test accounts directly in the Supabase dashboard:
1. Go to **Authentication → Users**
2. Click **Add User** to create test accounts

## Troubleshooting

**"Module not found" error:**
- Make sure `.env` file exists and has the correct values
- Restart the dev server after creating `.env`

**"Invalid login credentials":**
- Check that the email/password are correct
- Make sure the user exists in your Supabase project

**CORS errors:**
- Verify your Supabase project URL is correct
- Check that your domain is allowed in Supabase → Settings → Auth

## Security Tips

⚠️ **Never commit `.env` to git**
- Make sure `.env` is in your `.gitignore` file
- Only commit `.env.example`

## Next Steps

1. Set up email verification/confirmation
2. Add password reset functionality
3. Implement OAuth providers (Google, GitHub)
4. Store additional user metadata (name, avatar, etc.)
5. Integrate with users table for role management
