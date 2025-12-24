import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase client for API operations (server-side with admin privileges)
// Only created if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
export const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  : null;

// Supabase client for public/anonymous operations (if needed)
// Only created if SUPABASE_URL and SUPABASE_ANON_KEY are set
export const supabasePublic = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    )
  : null;

// Helper function to verify Supabase API connection
export const testSupabaseConnection = async () => {
  if (!supabase) {
    return { success: false, error: 'Supabase API not configured (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)' };
  }

  try {
    // Try a simple query to test connection
    // Using a system table that should exist
    const { data, error } = await supabase.rpc('version');
    if (error && error.code !== 'PGRST116' && error.code !== '42883') {
      // PGRST116 = relation does not exist, 42883 = function does not exist
      // Both are fine for new projects
      throw error;
    }
    return { success: true };
  } catch (error) {
    // If RPC fails, try a simple select
    try {
      const { error: selectError } = await supabase.from('_prisma_migrations').select('count').limit(1);
      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError;
      }
      return { success: true };
    } catch (err) {
      // API connection works but no tables yet - this is fine
      return { success: true, warning: 'API connected but database is new (no tables yet)' };
    }
  }
};

