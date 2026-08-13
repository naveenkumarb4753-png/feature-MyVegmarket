"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";

type ExporterRow = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  trade_license_no: string | null;
  approved: boolean | null;
  status: string | null; // "pending" | "approved" | "rejected"
  created_at: string | null;
};

const ACCOUNTS_TABLE = "exporter_accounts";
const EXPORTERS_TABLE = "exporters";

const SESSION_DAYS = 90;
const LS_KEY = "exporter_session_v1";

function requireSupabase() {
  const supabase = getSupabase();
  if (!supabase) {
    alert(
      "Supabase env missing. Add NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
    return null;
  }
  return supabase;
}

/** ---------- crypto helpers ---------- */
function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(text: string) {
  const enc = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  return toHex(hash);
}

function randomToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function addDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/** ---------- session storage (CLIENT ONLY) ---------- */
function readSessionClientOnly() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      email: string;
      token: string;
      expiresAt: string;
    };
    if (!parsed?.email || !parsed?.token || !parsed?.expiresAt) return null;
    if (new Date(parsed.expiresAt) <= new Date()) return null;
    return {
      email: parsed.email.trim().toLowerCase(),
      token: parsed.token,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

function writeSession(s: { email: string; token: string; expiresAt: string }) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

function clearSession() {
  localStorage.removeItem(LS_KEY);
}

export default function ExporterVerifyPage() {
  const [loading, setLoading] = useState(false);

  // ✅ avoid hydration mismatch
  const [mounted, setMounted] = useState(false);

  // auth state
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");

  // signup/login inputs
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  // exporter profile state
  const [profile, setProfile] = useState<ExporterRow | null>(null);

  // verification form
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [tradeLicenseNo, setTradeLicenseNo] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");

  const displayStatus = useMemo(() => {
    const st = (profile?.status ?? "").toLowerCase();
    if (st) return st;
    if (profile?.approved) return "approved";
    return profile ? "pending" : "";
  }, [profile]);

  const isVerified = useMemo(() => {
    const st = (profile?.status ?? "").toLowerCase();
    return profile?.approved === true || st === "approved";
  }, [profile]);

  /** ✅ mount + restore session ONLY on client */
  useEffect(() => {
    setMounted(true);
    const s = readSessionClientOnly();
    if (!s) return;
    setAuthedEmail(s.email);
    setAuthEmail(s.email);
  }, []);

  /** ✅ load exporter profile if logged in */
  useEffect(() => {
    if (!mounted) return;
    if (!authedEmail) {
      setProfile(null);
      return;
    }
    loadExporterProfile(authedEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, authedEmail]);

  async function loadExporterProfile(email: string) {
    const supabase = requireSupabase();
    if (!supabase) return;

    setLoading(true);
    const { data, error } = await supabase
      .from(EXPORTERS_TABLE)
      .select(
        "id,full_name,company_name,email,phone,country,city,trade_license_no,approved,status,created_at"
      )
      .eq("email", email.trim().toLowerCase())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setLoading(false);

    if (error) {
      alert(error.message);
      setProfile(null);
      return;
    }
    setProfile((data as any) ?? null);
  }

  /** ---------- AUTH: signup ---------- */
  async function handleSignup() {
    const supabase = requireSupabase();
    if (!supabase) return;

    const email = authEmail.trim().toLowerCase();
    const pass = authPassword;

    if (!email) return alert("Enter email");
    if (!pass || pass.length < 6)
      return alert("Password must be at least 6 characters");

    setLoading(true);

    // 1) check if email exists
    const { data: existing, error: exErr } = await supabase
      .from(ACCOUNTS_TABLE)
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (exErr) {
      setLoading(false);
      return alert(exErr.message);
    }
    if (existing?.email) {
      setLoading(false);
      return alert("This email already has an account. Please login.");
    }

    // 2) create account + session
    const password_hash = await sha256(pass);
    const token = randomToken();
    const expiresAt = addDaysISO(SESSION_DAYS);

    const payload = {
      email,
      password_hash,
      session_token: token,
      session_expires_at: expiresAt, // ✅ must exist in DB
    };

    const { error: insErr } = await supabase
      .from(ACCOUNTS_TABLE)
      .insert([payload]);

    setLoading(false);

    if (insErr) return alert(insErr.message);

    // ✅ logged in immediately
    writeSession({ email, token, expiresAt });
    setAuthedEmail(email);
    alert("✅ Signup successful. You are logged in for 90 days.");
  }

  /** ---------- AUTH: login ---------- */
  async function handleLogin() {
    const supabase = requireSupabase();
    if (!supabase) return;

    const email = authEmail.trim().toLowerCase();
    const pass = authPassword;

    if (!email) return alert("Enter email");
    if (!pass) return alert("Enter password");

    setLoading(true);

    const { data, error } = await supabase
      .from(ACCOUNTS_TABLE)
      .select("email,password_hash")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      setLoading(false);
      return alert(error.message);
    }

    if (!data) {
      setLoading(false);
      return alert("Account not found. Please signup.");
    }

    const passHash = await sha256(pass);
    if (passHash !== (data as any).password_hash) {
      setLoading(false);
      return alert("Wrong password.");
    }

    // refresh session token (90 days)
    const token = randomToken();
    const expiresAt = addDaysISO(SESSION_DAYS);

    const { error: updErr } = await supabase
      .from(ACCOUNTS_TABLE)
      .update({ session_token: token, session_expires_at: expiresAt })
      .eq("email", email);

    setLoading(false);

    if (updErr) return alert(updErr.message);

    writeSession({ email, token, expiresAt });
    setAuthedEmail(email);
    alert("✅ Logged in for 90 days.");
  }

  async function handleLogout() {
    const supabase = requireSupabase();
    if (!supabase) return;

    const s = readSessionClientOnly();

    clearSession();
    setAuthedEmail(null);
    setProfile(null);
    setAuthPassword("");

    // optional: clear session server-side too
    if (s?.email) {
      await supabase
        .from(ACCOUNTS_TABLE)
        .update({ session_token: null, session_expires_at: null })
        .eq("email", s.email);
    }
  }

  /** ---------- Verification submission (ONLY if exporter row doesn't exist) ---------- */
  async function submitVerification() {
    const supabase = requireSupabase();
    if (!supabase) return;

    const email = (authedEmail ?? "").trim().toLowerCase();
    if (!email) return alert("Not logged in.");

    // ✅ IMPORTANT: do not allow re-submit if profile exists
    if (profile?.email) {
      return alert("You already submitted verification. Please wait for admin approval.");
    }

    if (!fullName.trim()) return alert("Enter full name");
    if (!companyName.trim()) return alert("Enter company name");
    if (!phone.trim()) return alert("Enter phone");
    if (!tradeLicenseNo.trim()) return alert("Enter trade license number");

    setLoading(true);

    const payload = {
      email,
      full_name: fullName.trim(),
      company_name: companyName.trim(),
      phone: phone.trim(),
      trade_license_no: tradeLicenseNo.trim(),
      country: country.trim() || null,
      city: city.trim() || null,
      approved: false,
      status: "pending",
    };

    const { data, error } = await supabase
      .from(EXPORTERS_TABLE)
      .insert([payload])
      .select(
        "id,full_name,company_name,email,phone,country,city,trade_license_no,approved,status,created_at"
      )
      .single();

    setLoading(false);

    if (error) return alert(error.message);

    setProfile(data as any);
    alert("✅ Submitted. Admin will review and approve.");
  }

  /** ---------- UI ---------- */

  // ✅ prevent hydration mismatch
  if (!mounted) return null;

  // ✅ if NOT logged in → show Signup/Login
  if (!authedEmail) {
    return (
      <main className="min-h-screen bg-[#f6f8f7] px-4 sm:px-6 lg:px-12 pt-8 pb-20">
        <div className="max-w-[900px] mx-auto">
          <div className="flex items-center justify-between">
    <Link
      href="/"
      aria-label="Back"
      className="w-12 h-12 rounded-full bg-white border border-[#d7e3dc]
                 flex items-center justify-center shadow-md z-[9999] relative
                 hover:shadow-lg active:scale-95 transition"
    >
      <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M15 18l-6-6 6-6"
          fill="none"
          stroke="#000000"       // ✅ black arrow
          strokeWidth="3.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
 
    
            <div className="w-11 h-11 rounded-full bg-white border border-[#e0e8e3] flex items-center justify-center">
              🔐
            </div>
          </div>

          <div className="mt-8 bg-white border border-[#e0e8e3] rounded-[36px] p-8 sm:p-12 shadow-[0_20px_60px_rgba(17,23,19,0.08)] text-center">
            <h1 className="text-4xl sm:text-5xl font-black text-[#111713]">
              Exporter Access
            </h1>
            <p className="mt-3 text-[#648770] font-medium text-lg">
              Create your account once. Next time just login. Session stays for{" "}
              <b>90 days</b>.
            </p>

            <div className="mt-8 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                className={[
                  "h-11 px-6 rounded-full font-black border transition",
                  authMode === "signup"
                    ? "bg-[#1db954] text-white border-[#1db954]"
                    : "bg-white text-[#111713] border-[#e0e8e3] hover:bg-[#f6f8f7]",
                ].join(" ")}
              >
                Signup
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className={[
                  "h-11 px-6 rounded-full font-black border transition",
                  authMode === "login"
                    ? "bg-[#111713] text-white border-[#111713]"
                    : "bg-white text-[#111713] border-[#e0e8e3] hover:bg-[#f6f8f7]",
                ].join(" ")}
              >
                Login
              </button>
            </div>

            <div className="mt-7 text-left">
              <div className="text-sm font-black text-[#111713]">Email</div>
              <input
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="name@company.com"
                className="mt-2 w-full rounded-[22px] border border-[#e0e8e3] bg-white px-5 py-4
           text-[#111713] placeholder:text-[#9bb1a6] caret-[#111713]
           outline-none font-semibold focus:ring-2 focus:ring-[#1db954]/20"
              />
            </div>

            <div className="mt-5 text-left">
              <div className="text-sm font-black text-[#111713]">Password</div>
              <input
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                type="password"
                className="mt-2 w-full rounded-[22px] border border-[#e0e8e3] bg-white px-5 py-4
           text-[#111713] placeholder:text-[#9bb1a6] caret-[#111713]
           outline-none font-semibold focus:ring-2 focus:ring-[#1db954]/20"
              />
            </div>

            <button
              disabled={loading}
              onClick={authMode === "signup" ? handleSignup : handleLogin}
              className={[
                "mt-7 w-full rounded-full px-6 py-5 font-black text-xl disabled:opacity-60",
                authMode === "signup"
                  ? "bg-[#1db954] text-white"
                  : "bg-[#111713] text-white",
              ].join(" ")}
            >
              {loading
                ? "Please wait..."
                : authMode === "signup"
                ? "Create Account"
                : "Login"}
            </button>

            <div className="mt-5 text-xs font-bold text-[#8aa59a]">
              Email must be unique. Signup will not allow duplicate emails.
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ✅ logged in → show verification / status
  return (
    <main className="min-h-screen bg-[#f6f8f7] px-4 sm:px-6 lg:px-12 pt-8 pb-20">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex items-center justify-between">
   
  <Link
  href="/"
  aria-label="Back"
  className="w-11 h-11 rounded-full bg-white border border-[#d7e3dc]
             flex items-center justify-center shadow-md active:scale-95 transition"
>
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    aria-hidden="true"
    style={{ display: "block" }}
  >
    <path
      d="M15 18l-6-6 6-6"
      fill="none"
      stroke="#000"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
</Link>
  

          <button
            type="button"
            onClick={handleLogout}
            className="h-11 px-5 rounded-full bg-white border border-[#e0e8e3] font-black text-[#111713] hover:bg-[#f6f8f7]"
          >
            Logout
          </button>
        </div>

        <div className="mt-6 bg-white border border-[#e0e8e3] rounded-[36px] p-8 sm:p-12 shadow-[0_20px_60px_rgba(17,23,19,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl sm:text-5xl font-black text-[#111713]">
                Exporter Verification
              </h1>
              <p className="mt-3 text-[#648770] font-medium text-lg">
                Logged in as <b className="text-[#111713]">{authedEmail}</b>
              </p>
            </div>

            {profile && (
              <div className="px-5 py-3 rounded-[22px] border border-[#e0e8e3] bg-[#f6f8f7]">
                <div className="text-xs font-black text-[#648770] uppercase">
                  Status
                </div>
                <div className="text-xl font-black text-[#111713]">
                  {displayStatus}
                </div>
              </div>
            )}
          </div>

          {/* ✅ If profile exists: DO NOT ask again */}
          {profile ? (
            <div className="mt-6 rounded-[22px] bg-[#f6f8f7] border border-[#e0e8e3] p-6">
              {isVerified ? (
                <>
                  <p className="text-[#1db954] font-black text-lg">✅ Approved</p>
                  <p className="mt-1 text-[#648770] font-medium">
                    You can now create container listings.
                  </p>

                  <Link
                    href={`/containers-listing/list/create?email=${encodeURIComponent(
                      authedEmail
                    )}`}
                    className="inline-flex mt-5 items-center justify-center rounded-full px-7 py-3 bg-[#1db954] text-white font-black"
                  >
                    Create Listing
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-[#111713] font-black text-lg">
                    ⏳ Pending Approval
                  </p>
                  <p className="mt-1 text-[#648770] font-medium">
                    Admin is reviewing your verification. No need to submit again.
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              {/* ✅ Only if exporter row doesn't exist → show form */}
              <div className="mt-8">
                <h2 className="text-3xl font-black text-[#111713]">
                  Submit Verification
                </h2>
                <p className="mt-2 text-[#648770] font-medium">
                  Fill your business details once. Admin approves → you can list
                  containers.
                </p>

                <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field label="Full Name" value={fullName} setValue={setFullName} />
                  <Field label="Company Name" value={companyName} setValue={setCompanyName} />
                  <Field label="Phone Number" value={phone} setValue={setPhone} />
                  <Field
                    label="Trade License No"
                    value={tradeLicenseNo}
                    setValue={setTradeLicenseNo}
                  />
                  <Field label="Country" value={country} setValue={setCountry} />
                  <Field label="City" value={city} setValue={setCity} />
                </div>

                <button
                  onClick={submitVerification}
                  disabled={loading}
                  className="mt-8 w-full rounded-full px-6 py-5 bg-[#1db954] text-white font-black text-xl disabled:opacity-60"
                >
                  {loading ? "Submitting..." : "Submit Verification"}
                </button>
              </div>
            </>
          )}

          {loading && (
            <div className="mt-4 text-[#648770] font-semibold">Loading…</div>
          )}
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  setValue,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
}) {
  return (
    <label className="block">
      <div className="text-sm font-black text-[#111713]">{label}</div>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="mt-2 w-full rounded-[22px] border border-[#e0e8e3] bg-white px-5 py-4
           text-[#111713] placeholder:text-[#9bb1a6] caret-[#111713]
           outline-none font-semibold focus:ring-2 focus:ring-[#1db954]/20"
      />
    </label>
  );
}
