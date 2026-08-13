"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";

function safeSupabase() {
  try {
    return getSupabase();
  } catch {
    return null;
  }
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("yksample@gmail.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function signIn() {
    setErr(null);
    const supabase = safeSupabase();
    if (!supabase) return setErr("Supabase not ready.");

    if (!email.trim() || !password.trim()) return setErr("Enter email & password.");

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) return setErr(error.message);

      router.push("/admin/price-approvals");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#f6f8f7] px-4 sm:px-6 lg:px-12 py-10">
      <div className="max-w-[560px] mx-auto bg-white border border-[#e0e8e3] rounded-[28px] p-8 shadow-sm">
        <h1 className="text-3xl font-black text-[#111713]">Admin Login</h1>
        <p className="mt-1 text-[#648770] font-semibold">
          Login with admin email (must be in admin_allowlist).
        </p>

        <div className="mt-6">
          <label className="block text-sm font-black text-[#111713] mb-2">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-12 px-4 rounded-[18px] border border-[#e0e8e3] bg-[#f6f8f7] font-semibold outline-none"
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-black text-[#111713] mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-12 px-4 rounded-[18px] border border-[#e0e8e3] bg-[#f6f8f7] font-semibold outline-none"
          />
        </div>

        {err && <div className="mt-3 text-sm font-black text-red-600">{err}</div>}

        <button
          onClick={signIn}
          disabled={loading}
          className="mt-6 w-full h-12 rounded-full bg-[#1db954] text-white font-black disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Login & Open Approvals"}
        </button>
      </div>
    </main>
  );
}
