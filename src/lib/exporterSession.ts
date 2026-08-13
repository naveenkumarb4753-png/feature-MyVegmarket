import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const COOKIE_NAME = "mv_exporter_session";

export async function getExporterAccountFromSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const { data, error } = await supabaseAdmin
    .from("exporter_sessions")
    .select("account_id,expires_at,exporter_accounts(email)")
    .eq("session_token", token)
    .maybeSingle();

  if (error || !data) return null;

  if (new Date(data.expires_at) <= new Date()) return null;

  return {
    account_id: data.account_id,
    email: (data as any).exporter_accounts?.email as string,
  };
}
