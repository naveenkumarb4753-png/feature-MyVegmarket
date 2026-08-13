import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const COOKIE_NAME = "mv_exporter_session";

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

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    await supabaseAdmin.from("exporter_sessions").delete().eq("session_token", token);
  }

  const res = NextResponse.json(
    { ok: true },
    { headers: corsHeaders(origin) }
  );

  res.cookies.set(COOKIE_NAME, "", { path: "/", expires: new Date(0) });
  return res;
}