import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // ✅ Do NOT throw. Just return null if missing.
  if (!url || !key) return null;

  // ✅ Works in both server + client
  if (!client) client = createClient(url, key);

  return client;
}