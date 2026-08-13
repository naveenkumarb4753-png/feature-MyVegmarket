// src/lib/roles.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabaseClient";

export type UserRole = "admin" | "updater" | "buyer" | "guest";

type AllowRow = {
  role: UserRole;
};

function safeSupabase(): SupabaseClient | null {
  try {
    return getSupabase();
  } catch {
    return null;
  }
}

/**
 * Returns the role for the currently logged-in user (via admin_allowlist),
 * otherwise "guest".
 */
export async function getMyRole(): Promise<UserRole> {
  const supabase = safeSupabase();
  if (!supabase) return "guest";

  const { data: auth } = await supabase.auth.getUser();
  const email = auth?.user?.email?.toLowerCase().trim();
  if (!email) return "guest";

  const { data, error } = await supabase
    .from("admin_allowlist")
    .select("role")
    .eq("email", email)
    .maybeSingle<AllowRow>();

  if (error || !data?.role) return "guest";
  return data.role;
}

export async function isAdmin(): Promise<boolean> {
  return (await getMyRole()) === "admin";
}

export async function isUpdater(): Promise<boolean> {
  return (await getMyRole()) === "updater";
}

/**
 * ✅ Used in pages:
 * const r = await requireRole(["admin"])
 * if (r.ok) r.email exists
 */
export async function requireRole(allowed: UserRole[]): Promise<{
  ok: boolean;
  role: UserRole;
  email: string | null;
}> {
  const supabase = safeSupabase();
  if (!supabase) return { ok: false, role: "guest", email: null };

  const { data: auth } = await supabase.auth.getUser();
  const email = auth?.user?.email?.toLowerCase().trim() || null;
  if (!email) return { ok: false, role: "guest", email: null };

  const { data, error } = await supabase
    .from("admin_allowlist")
    .select("role")
    .eq("email", email)
    .maybeSingle<AllowRow>();

  const role: UserRole = error || !data?.role ? "guest" : data.role;
  return { ok: allowed.includes(role), role, email };
}

/**
 * ✅ Used in callback page:
 * const role = await getRoleByEmail(email)
 */
export async function getRoleByEmail(email: string): Promise<UserRole | null> {
  const supabase = safeSupabase();
  if (!supabase) return null;

  const e = email.toLowerCase().trim();

  const { data, error } = await supabase
    .from("admin_allowlist")
    .select("role")
    .eq("email", e)
    .maybeSingle<AllowRow>();

  if (error || !data?.role) return null;
  return data.role;
}
