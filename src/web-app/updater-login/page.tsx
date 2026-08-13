"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";

const UPDATERS_TABLE = "updaters";

async function sha256Hex(input: string) {
  const enc = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeSupabase() {
  try {
    return getSupabase();
  } catch {
    return null;
  }
}

export default function UpdaterLoginPage() {
  const router = useRouter();

  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // Prefill if already stored
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("updater_secret") || "";
    if (saved) setSecret(saved);
  }, []);

  async function validateAndGo() {
    setErr(null);

    const s = secret.trim();
    if (!s) {
      setErr("Enter your updater secret key.");
      return;
    }

    const supabase = safeSupabase();
    if (!supabase) {
      setErr("Supabase not configured. Check env keys and restart.");
      return;
    }

    setLoading(true);
    try {
      const hash = await sha256Hex(s);

      const { data, error } = await supabase
        .from(UPDATERS_TABLE)
        .select("id,name,is_active")
        .eq("secret_hash", hash)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        setErr(error.message);
        return;
      }

      if (!data) {
        setErr("Invalid secret key.");
        return;
      }

      // store and redirect
      if (typeof window !== "undefined") {
        localStorage.setItem("updater_secret", s);
      }

      router.push(`/price-updater?secret=${encodeURIComponent(s)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#f6f8f7] px-4 sm:px-6 lg:px-12 py-10">
      <div className="max-w-[960px] mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-[#648770] font-black hover:underline">
          ← Back
        </Link>

        <div className="mt-6 bg-white border border-[#e0e8e3] rounded-[28px] p-10 shadow-sm">
          <div className="text-4xl font-black text-[#111713]">Updater Access</div>
          <p className="mt-2 text-[#648770] font-semibold">
            Enter the updater secret to open the price update dashboard. (No email / no expiry)
          </p>

          <div className="mt-8">
            <label className="block text-sm font-black text-[#111713] mb-2">Secret Key</label>
            <input
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="e.g. VINODH-2026-SECRET-001"
              className="w-full h-12 px-4 rounded-[18px] border border-[#e0e8e3] bg-[#f6f8f7] text-[#111713] font-semibold outline-none focus:ring-2 focus:ring-[#1db954]/30"
            />
            {err && <div className="mt-2 text-sm font-black text-red-600">{err}</div>}
          </div>

          <button
            onClick={validateAndGo}
            disabled={loading}
            className="mt-6 w-full h-12 rounded-full bg-[#1db954] text-white font-black shadow-[0_12px_28px_rgba(29,185,84,0.25)] hover:brightness-110 transition disabled:opacity-60"
          >
            {loading ? "Checking…" : "Open Updater Dashboard"}
          </button>

          <div className="mt-4 text-xs text-[#8aa59a] font-semibold">
            Tip: keep the secret strong and do not share publicly. Later we can upgrade to real updater accounts.
          </div>
        </div>
      </div>
    </main>
  );
}
