import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const COOKIE_NAME = "mv_exporter_session";

function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

function corsHeaders(origin?: string | null) {
  const allowedOrigins = [
    "http://localhost:8081",
    "http://localhost:3000",
    "https://www.myvegmarket.com",
    "https://myvegmarket.com",
  ];

  const allowOrigin =
    origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
  };
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");

  try {
    const body = await req.json().catch(() => null);
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "").trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const { data, error: checkErr } = await supabaseAdmin
      .from("exporter_accounts")
      .select("id,email")
      .eq("email", email)
      .limit(2);

    if (checkErr) {
      return NextResponse.json(
        { error: checkErr.message },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    const existing = data ?? [];

    if (existing.length >= 1) {
      return NextResponse.json(
        { error: "Email already registered. Please login." },
        { status: 409, headers: corsHeaders(origin) }
      );
    }

    const password_hash = await bcrypt.hash(password, 12);

    const { data: account, error: accErr } = await supabaseAdmin
      .from("exporter_accounts")
      .insert([{ email, password_hash }])
      .select("id,email")
      .single();

    if (accErr || !account) {
      return NextResponse.json(
        { error: accErr?.message ?? "Signup failed" },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    const session_token = makeToken();
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const { error: sErr } = await supabaseAdmin.from("exporter_sessions").insert([
      {
        account_id: account.id,
        session_token,
        expires_at: expires.toISOString(),
      },
    ]);

    if (sErr) {
      return NextResponse.json(
        { error: sErr.message },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    const res = NextResponse.json(
      { ok: true, email: account.email, session_token },
      { status: 200, headers: corsHeaders(origin) }
    );

    res.cookies.set(COOKIE_NAME, session_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires,
    });

    return res;
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Signup failed" },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}