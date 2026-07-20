/* ==========================================================================
   supabase-init.js — Initializes the Supabase client connection
   ========================================================================== */

const SUPABASE_URL = 'https://kysldevlhtofacrqjfmp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_c33fN0rNbwuUGw8zIv4Irw_Ta0_joLD';

// Initialize the Supabase client using the UMD build loaded locally
if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
  try {
    window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    console.error("Failed to initialize Supabase client", err);
  }
} else {
  console.warn("Supabase library not found");
}
