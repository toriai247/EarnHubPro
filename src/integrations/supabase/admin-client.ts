
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// WARNING: This key has FULL ACCESS to your database.
// Do not expose this file to public users if possible.
// In production, move this to an Environment Variable (process.env.VITE_SUPABASE_SERVICE_ROLE_KEY)

const SUPABASE_URL = "https://tyhujeggtfpbkpywtrox.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5aHVqZWdndGZwYmtweXd0cm94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYwMzQwOCwiZXhwIjoyMDc5MTc5NDA4fQ._51wGyd95fkHFsb3Rj8P8j9Gxr8_dB_7i6CF4V_kCv0";

// Admin client that bypasses Row Level Security (RLS)
export const supabaseAdmin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
