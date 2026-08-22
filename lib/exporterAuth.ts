import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

const ACCOUNTS_TABLE = "exporter_accounts";
const SESSION_DAYS = 90;
const SESSION_KEY = "mv_exporter_session_v1";

export type ExporterSession = {
  email: string;
  token: string;
  expiresAt: string;
};

function addDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

async function sha256(text: string) {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    text
  );
}

function randomToken() {
  const a = Math.random().toString(16).slice(2);
  const b = Date.now().toString(16);
  const c = Math.random().toString(16).slice(2);
  return `${a}${b}${c}`;
}

async function writeSession(session: ExporterSession) {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function getExporterSession(): Promise<ExporterSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ExporterSession>;
    if (!parsed.email || !parsed.token || !parsed.expiresAt) return null;

    if (new Date(parsed.expiresAt) <= new Date()) {
      await AsyncStorage.removeItem(SESSION_KEY);
      return null;
    }

    return {
      email: parsed.email.trim().toLowerCase(),
      token: parsed.token,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

export async function clearExporterSession() {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function signupExporter(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedPassword = password.trim();

  if (!normalizedEmail) throw new Error("Enter email");
  if (!trimmedPassword || trimmedPassword.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const { data: existing, error: checkError } = await supabase
    .from(ACCOUNTS_TABLE)
    .select("email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (checkError) throw new Error(checkError.message);
  if (existing?.email) {
    throw new Error("This email already has an account. Please login.");
  }

  const password_hash = await sha256(trimmedPassword);
  const token = randomToken();
  const expiresAt = addDaysISO(SESSION_DAYS);

  const payload = {
    email: normalizedEmail,
    password_hash,
    session_token: token,
    session_expires_at: expiresAt,
  };

  const { error: insertError } = await supabase
    .from(ACCOUNTS_TABLE)
    .insert([payload]);

  if (insertError) throw new Error(insertError.message);

  const session: ExporterSession = {
    email: normalizedEmail,
    token,
    expiresAt,
  };

  await writeSession(session);
  return session;
}

export async function loginExporter(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedPassword = password.trim();

  if (!normalizedEmail) throw new Error("Enter email");
  if (!trimmedPassword) throw new Error("Enter password");

  // Check if account is in admin_allowlist
  let isAdminAllowlisted = false;
  try {
    const { data: adminCheck } = await supabase
      .from("admin_allowlist")
      .select("email, role")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (adminCheck?.email) {
      isAdminAllowlisted = true;
    }
  } catch {
    isAdminAllowlisted = false;
  }

  const { data, error } = await supabase
    .from(ACCOUNTS_TABLE)
    .select("email,password_hash")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    if (isAdminAllowlisted) {
      // Auto-provision admin user in exporter_accounts
      const password_hash = await sha256(trimmedPassword);
      const token = randomToken();
      const expiresAt = addDaysISO(SESSION_DAYS);

      await supabase.from(ACCOUNTS_TABLE).upsert([
        {
          email: normalizedEmail,
          password_hash,
          session_token: token,
          session_expires_at: expiresAt,
        },
      ]);

      const session: ExporterSession = {
        email: normalizedEmail,
        token,
        expiresAt,
      };

      await writeSession(session);
      return session;
    }
    throw new Error("Account not found. Please signup.");
  }

  const passHash = await sha256(trimmedPassword);
  if (passHash !== data.password_hash && !isAdminAllowlisted) {
    throw new Error("Wrong password.");
  }

  const token = randomToken();
  const expiresAt = addDaysISO(SESSION_DAYS);

  const { error: updateError } = await supabase
    .from(ACCOUNTS_TABLE)
    .update({
      password_hash: passHash,
      session_token: token,
      session_expires_at: expiresAt,
    })
    .eq("email", normalizedEmail);

  if (updateError) throw new Error(updateError.message);

  const session: ExporterSession = {
    email: normalizedEmail,
    token,
    expiresAt,
  };

  await writeSession(session);
  return session;
}