import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email ?? "").trim().toLowerCase();
    const phone = (body?.phone ?? "").trim();

    if (!email && !phone) {
      return NextResponse.json({ active: false }, { status: 200 });
    }

    const filterCol = email ? "email" : "phone";
    const filterVal = email ? email : phone;

    const { data, error } = await supabaseAdmin
      .from("buyer_subscriptions")
      .select("status,current_period_end,created_at")
      .eq(filterCol, filterVal)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      return NextResponse.json(
        { active: false, error: error.message },
        { status: 200 }
      );
    }

    const row: any = data?.[0];
    if (!row) return NextResponse.json({ active: false }, { status: 200 });

    const endOk =
      !row.current_period_end ||
      new Date(row.current_period_end) > new Date();

    const active = row.status === "active" && endOk;

    return NextResponse.json({ active }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { active: false, error: e?.message ?? "unknown" },
      { status: 200 }
    );
  }
}
