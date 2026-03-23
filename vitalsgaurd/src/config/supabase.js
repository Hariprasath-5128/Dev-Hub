import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Supabase JWT anon keys always start with "eyJ".
// The key in the current .env starts with "sb_publishable_" which is a different
// Supabase token type — it cannot be used with createClient.
const hasValidCreds =
  SUPABASE_URL.startsWith('https://') &&
  SUPABASE_ANON_KEY.startsWith('eyJ');

let _client = null;
if (hasValidCreds) {
  try {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.error('Supabase init failed:', e);
  }
} else {
  console.warn(
    '[VitalsGuard] Running in OFFLINE/DEMO mode — Supabase anon key is missing or ' +
    'invalid. The app uses local demo authentication. To enable real auth, paste ' +
    'your JWT anon key (starts with eyJ...) into vitalsgaurd/.env as VITE_SUPABASE_ANON_KEY.'
  );
}

// Safe offline stub — every method returns a harmless resolved promise.
const offlineStub = {
  auth: {
    getSession:          async () => ({ data: { session: null }, error: null }),
    onAuthStateChange:   ()       => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword:  async () => ({ data: null, error: { message: 'OFFLINE_MODE' } }),
    signOut:             async () => ({}),
  },
};

export const supabase = _client || offlineStub;
export const isOfflineMode = !_client;
