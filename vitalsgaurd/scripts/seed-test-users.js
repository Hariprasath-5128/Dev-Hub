import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Test users to create
const testUsers = [
  {
    email: 'admin1@gmail.com',
    password: 'admin1',
    role: 'admin',
    emailConfirmed: true,
  },
  {
    email: 'doctor1@gmail.com',
    password: 'doctor1',
    role: 'doctor',
    emailConfirmed: true,
  },
  {
    email: 'patient1@gmail.com',
    password: 'patient1',
    role: 'patient',
    emailConfirmed: true,
  },
];

async function seedTestUsers() {
  console.log('🌱 Seeding test users...\n');

  for (const user of testUsers) {
    try {
      console.log(`Creating user: ${user.email} (${user.role})...`);

      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          role: user.role,
        },
      });

      if (error) {
        if (error.message.includes('already exists')) {
          console.log(`✅ User already exists: ${user.email}`);
        } else {
          throw error;
        }
      } else {
        console.log(`✅ Created user: ${user.email}`);
      }
    } catch (err) {
      console.error(`❌ Error creating user ${user.email}:`, err.message);
    }
  }

  console.log('\n✨ Test users seeding complete!');
  console.log('\nYou can now login with:');
  testUsers.forEach(user => {
    console.log(`  📧 ${user.email} / 🔐 ${user.password}`);
  });
}

seedTestUsers().catch(console.error);
