import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client with service role key.
 * Use only in secure server contexts (e.g. cron, sync jobs). Never expose to the client.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createSupabaseClient(url, key);
}
