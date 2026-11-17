import { createClient } from '@supabase/supabase-js';

function getConfig() {
  const env = import.meta.env || {};
  return {
    url: (env.VITE_SUPABASE_URL || '').trim(),
    key: (env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim()
  };
}

let supabaseInstance = null;

export function getSupabase() {
  const { url, key } = getConfig();
  if (!url || !key) return null;

  if (!supabaseInstance) {
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
  return supabaseInstance;
}

export async function resolveGuestId(supabase, userId) {
  if (!supabase || !userId) return null;

  const { data, error } = await supabase
    .from('guests')
    .select('id')
    .eq('profile_id', userId)
    .maybeSingle();

  if (error) {
    console.warn("Could not find guest entry for profile_id:", userId, error.message);
    return null;
  }
  return data ? data.id : null;
}

export async function fetchUserProfile(supabase, userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role')
    .eq('id', userId)
    .single();

  if (error) {
    console.warn("Could not fetch profile for user:", userId, error.message);
    return null;
  }
  return data;
}
