import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

/**
 * Server-side Supabase client using the service-role key.
 * This bypasses RLS, so every query MUST be scoped by `user_id`.
 */
export const supabaseAdmin = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);
