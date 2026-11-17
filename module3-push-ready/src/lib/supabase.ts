import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Client for Module 3 (Staff & Task Management)
 * Hard Rules Compliance:
 * - Uses ONLY the Publishable (anon) Key.
 * - NEVER exposes or uses the service_role key on the client.
 * - Respects Row Level Security (RLS) and Supabase Auth.
 */

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('placeholder')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

/**
 * Health check helper to verify Supabase connectivity
 */
export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  message: string;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      connected: false,
      message:
        'Supabase credentials missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local',
    };
  }

  try {
    const { error } = await supabase.from('tasks').select('count', { count: 'exact', head: true });
    if (error) {
      // Table might not exist yet or connection error
      return {
        connected: false,
        message: `Supabase reached, but tasks table query returned: ${error.message}`,
      };
    }
    return { connected: true, message: 'Supabase connected successfully' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      connected: false,
      message: `Connection failed: ${errorMsg}`,
    };
  }
}
