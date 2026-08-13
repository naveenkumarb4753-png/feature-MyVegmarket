"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";

function safeSupabase() {
  try {
    return getSupabase();
  } catch {
    return null;
  }
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");

  useEffect(() => {
    // Ensure we have a session (callback should create it)
    let mounted = true;

    async function check() {
      setErr(null);
      setOkMsg(null);

      const supabase = safeSupabase();
      if (!supabase) {
        setErr("Supabase client not ready. Check env and refresh.");
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (!data?.session) {
        setErr("Reset link is invalid/expired. Please request a new reset email.");
      }
      setLoading(false);
    }

    check();
    return () => {
      mounted = false;
    };
  }, []);

  async function saveNewPassword() {
    setErr(null);
    setOkMsg(null);

    if (p1.length < 8) return setErr("Password must be at least 8 characters.");
    if (p1 !== p2) return setErr("Passwords do not match.");

    const supabase = safeSupabase();
    if (!supabase) return setErr("Supabase client not ready.");

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: p1 });
      if (error) return setErr(error.message);

      setOkMsg("✅ Password updated. Redirecting to Admin Login…");

      // optional: sign out so user logs in fresh
      await supabase.auth.signOut();

      setTimeout(() => {
        router.push("/admin-login");
      }, 900);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-[#f6f8f7] px-4 sm:px-6 lg:px-12 py-10">
        <div className="max-w-[560px] mx-auto text-[#111713] font-bold">Loading…</div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#f6f8f7] px-4 sm:px-6 lg:px-12 py-10">
      <div className="max-w-[560px] mx-auto bg-white border border-[#e0e8e3] rounded-[28px] p-8 shadow-sm">
        <h1 className="text-3xl font-black text-[#111713]">Reset Password</h1>
        <p className="mt-1 text-[#648770] font-semibold">
          Set a new password for your account.
        </p>

        {err && <div className="mt-4 text-sm font-black text-red-600">{err}</div>}
        {okMsg && <div className="mt-4 text-sm font-black text-green-700">{okMsg}</div>}

        <div className="mt-6">
          <label className="block text-sm font-black text-[#111713] mb-2">New password</label>
          <input
            type="password"
            value={p1}
            onChange={(e) => setP1(e.target.value)}
            className="w-full h-12 px-4 rounded-[18px] border border-[#e0e8e3] bg-[#f6f8f7] font-semibold outline-none"
            placeholder="Minimum 8 characters"
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-black text-[#111713] mb-2">Confirm password</label>
          <input
            type="password"
            value={p2}
            onChange={(e) => setP2(e.target.value)}
            className="w-full h-12 px-4 rounded-[18px] border border-[#e0e8e3] bg-[#f6f8f7] font-semibold outline-none"
          />
        </div>

        <button
          onClick={saveNewPassword}
          disabled={saving || !!err} // if link invalid, button disabled
          className="mt-6 w-full h-12 rounded-full bg-[#1db954] text-white font-black disabled:opacity-60"
        >
          {saving ? "Saving…" : "Update Password"}
        </button>

        <div className="mt-3 text-xs text-[#8aa59a] font-semibold">
          If you see “invalid/expired”, request a new reset email and open it immediately.
        </div>
      </div>
    </main>
  );
}
