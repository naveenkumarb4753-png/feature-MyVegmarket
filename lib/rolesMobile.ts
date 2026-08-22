import { supabase } from "@/lib/supabase";

export type MobileRole = "admin" | "seller" | "buyer";

const ADMIN_EMAILS_FALLBACK = ["admin@myvegmarket.com"];

export async function resolveMobileRole(email: string | null): Promise<MobileRole> {
  if (!email) return "buyer";
  const normalized = email.trim().toLowerCase();

  try {
    const { data } = await supabase
      .from("admin_allowlist")
      .select("role")
      .eq("email", normalized)
      .maybeSingle();

    if (data?.role === "admin") return "admin";
  } catch (e) {
    console.warn("Could not query admin_allowlist:", e);
  }

  return "buyer";
}

export async function isVerifiedAdmin(email: string | null): Promise<boolean> {
  return (await resolveMobileRole(email)) === "admin";
}
