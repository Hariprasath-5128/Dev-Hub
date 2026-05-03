import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL     || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const hasValidCreds = SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.length > 10;

let _client = null;
if (hasValidCreds) {
  try {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.error('[VitalsGuard] Supabase init failed:', e);
  }
} else {
  console.warn(
    '[VitalsGuard] Running in OFFLINE/DEMO mode — Supabase credentials missing or invalid. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in vitalsgaurd/.env to enable real auth.'
  );
}

// Safe offline stub so the app always works without a live Supabase project
const offlineStub = {
  auth: {
    getSession:         async () => ({ data: { session: null }, error: null }),
    onAuthStateChange:  ()       => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: async () => ({ data: null, error: { message: 'OFFLINE_MODE' } }),
    signUp:             async () => ({ data: null, error: { message: 'OFFLINE_MODE' } }),
    signOut:            async () => ({}),
  },
  from: () => ({
    insert:  async () => ({ data: null, error: { message: 'OFFLINE_MODE' } }),
    select:  () => ({
      eq:    () => ({
        eq:     async () => ({ data: null, error: { message: 'OFFLINE_MODE' } }),
        single: async () => ({ data: null, error: { message: 'OFFLINE_MODE' } }),
      }),
      single: async () => ({ data: null, error: { message: 'OFFLINE_MODE' } }),
    }),
  }),
};

export const supabase      = _client || offlineStub;
export const isOfflineMode = !_client;
