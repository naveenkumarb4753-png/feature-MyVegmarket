"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";

function safeSupabase() {
  try {
    return getSupabase();
  } catch {
    return null;
  }
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="p-6 font-bold">Signing you in…</div>}>
      <AuthCallbackInner />
    </Suspense>
  );
}

function AuthCallbackInner() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    let mounted = true;

    async function run() {
      const supabase = safeSupabase();
      if (!supabase) {
        router.replace("/reset-password?err=supabase_not_ready");
        return;
      }

      // 1) PKCE code flow (common)
      const code = sp.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace("/reset-password?err=" + encodeURIComponent(error.message));
          return;
        }
        if (!mounted) return;
        router.replace("/reset-password");
        return;
      }

      // 2) Recovery hash token flow (very common in reset emails)
      // Example:
      // /auth/callback#access_token=...&refresh_token=...&type=recovery
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      if (hash && hash.includes("access_token=") && hash.includes("refresh_token=")) {
        const params = new URLSearchParams(hash.replace("#", ""));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) {
            router.replace("/reset-password?err=" + encodeURIComponent(error.message));
            return;
          }
          if (!mounted) return;
          router.replace("/reset-password");
          return;
        }
      }

      // If neither exists, redirect with message
      router.replace("/reset-password?err=missing_token");
    }

    run();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#f6f8f7] px-4 sm:px-6 lg:px-12 py-10">
      <div className="max-w-[560px] mx-auto text-[#111713] font-bold">Signing you in…</div>
    </main>
  );
}