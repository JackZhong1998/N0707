import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _serviceSupabase: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
  return url;
}

/** Server-only administrative client. Never expose this key to browser code. */
export function getServiceSupabase(): SupabaseClient {
  if (!_serviceSupabase) {
    const secret =
      process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!secret) {
      throw new Error('SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is not configured');
    }
    _serviceSupabase = createClient(getSupabaseUrl(), secret, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return _serviceSupabase;
}
