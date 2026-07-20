/* ==========================================================================
   supabase-init.js — Initializes the Supabase client connection
   ========================================================================== */

const SUPABASE_URL = 'https://kysldevlhtofacrqjfmp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_c33fN0rNbwuUGw8zIv4Irw_Ta0_joLD';

// Memory storage fallback for aggressive adblockers / private modes that block localStorage
const memoryStorage = {
  items: {},
  getItem: (key) => memoryStorage.items[key] || null,
  setItem: (key, value) => { memoryStorage.items[key] = value; },
  removeItem: (key) => { delete memoryStorage.items[key]; }
};

let safeStorage = memoryStorage;
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('__test_storage__', '1');
    window.localStorage.removeItem('__test_storage__');
    safeStorage = window.localStorage; // LocalStorage is working
  }
} catch (e) {
  console.warn("localStorage is disabled (likely due to AdBlocker or Private Mode). Falling back to in-memory storage for Supabase.");
}

// Initialize the Supabase client using the UMD build loaded locally
if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
  try {
    window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: safeStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
  } catch (err) {
    console.error("Failed to initialize Supabase client", err);
  }
} else {
  console.warn("Supabase library not found");
}
