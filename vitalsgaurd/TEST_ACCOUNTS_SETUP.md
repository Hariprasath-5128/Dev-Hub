# How to Add Dummy Test Users

## Option 1: Manual Setup via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Click on **Authentication** in the left sidebar
4. Click on **Users**
5. Click **Add User** button

### Create User 1: Admin
- Email: `admin1@gmail.com`
- Password: `admin1`
- Auto Generate Password: ❌ Uncheck
- Click **Save**

### Create User 2: Doctor
- Email: `doctor1@gmail.com`
- Password: `doctor1`
- Auto Generate Password: ❌ Uncheck
- Click **Save**

### Create User 3: Patient
- Email: `patient1@gmail.com`
- Password: `patient1`
- Auto Generate Password: ❌ Uncheck
- Click **Save**

## Option 2: Using the Seed Script

If you have Node.js admin credentials, run:

```bash
node scripts/seed-test-users.js
```

**Note:** This script requires admin access to your Supabase project.

## Test the Login

1. Open http://localhost:5174/ in your browser
2. Click on "Sign Up" (or try "Login" if users already exist)
3. Enter one of the test credentials:
   - Email: `admin1@gmail.com`
   - Password: `admin1`

4. Select the role: **Select the appropriate role matching the email**
   - `admin1@gmail.com` → Hospital Admin
   - `doctor1@gmail.com` → Doctor
   - `patient1@gmail.com` → Patient

5. Click **Login**

## Test Accounts Summary

| Email | Password | Role |
|-------|----------|------|
| admin1@gmail.com | admin1 | Hospital Admin |
| doctor1@gmail.com | doctor1 | Doctor |
| patient1@gmail.com | patient1 | Patient |

## Troubleshooting

**"User already exists"**
- The user was already created. This is fine - just login with their credentials.

**"Invalid login credentials"**
- Make sure you're entering the exact email and password
- Check that the role matches the user type
- Try refreshing the page

**"Email not confirmed"**
- If using Supabase dashboard direct creation, the email is auto-confirmed
- You can login immediately

## Optional: Set User Metadata

To store role information in Supabase:

1. Go to **SQL Editor** in Supabase
2. Run this query:

```sql
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'patient' CHECK (role IN ('admin', 'doctor', 'patient')),
  created_at TIMESTAMP DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);
```

Then users' roles will be stored in this table for future reference.
