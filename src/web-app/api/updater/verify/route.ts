import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const secret = String(body?.secret || "").trim();

    if (!secret) {
      return NextResponse.json({ ok: false, error: "Missing secret" }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return NextResponse.json(
        { ok: false, error: "Server not configured (missing SUPABASE_SERVICE_ROLE_KEY)" },
        { status: 500 }
      );
    }

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

    const secret_hash = sha256Hex(secret);

    const { data, error } = await supabase
      .from("updaters")
      .select("id,name,is_active")
      .eq("secret_hash", secret_hash)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ ok: false, error: "Invalid / inactive secret" }, { status: 401 });
    }

    return NextResponse.json({ ok: true, updater: { id: data.id, name: data.name } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
