import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BUCKET = "container_images";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function publicUrl(path?: string | null) {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

function deny() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

function isSecretOk(secret: string) {
  // keep one secret everywhere (you already use NEXT_PUBLIC_ADMIN_SECRET in UI)
  const expected = (process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "").trim();
  return expected && secret && secret === expected;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = (url.searchParams.get("secret") || "").trim();
  if (!isSecretOk(secret)) return deny();

  const { data, error } = await supabaseAdmin
    .from("container_listings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, rows: data ?? [] }, { status: 200 });
}

export async function POST(req: Request) {
  const body = await req.json();
  const secret = (body?.secret ?? "").toString().trim();
  if (!isSecretOk(secret)) return deny();

  const listingId = (body?.listingId ?? "").toString();
  const action = (body?.action ?? "").toString(); // "approve" | "reject"

  if (!listingId) return NextResponse.json({ ok: false, error: "Missing listingId" }, { status: 400 });

  // Load listing
  const { data: listing, error: fetchErr } = await supabaseAdmin
    .from("container_listings")
    .select("*")
    .eq("id", listingId)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ ok: false, error: fetchErr.message }, { status: 500 });
  if (!listing) return NextResponse.json({ ok: false, error: "Listing not found" }, { status: 404 });

  if (action === "reject") {
    const { error: rejErr } = await supabaseAdmin
      .from("container_listings")
      .update({ status: "rejected", is_published: false })
      .eq("id", listingId);

    if (rejErr) return NextResponse.json({ ok: false, error: rejErr.message }, { status: 500 });
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // ✅ Approve / Publish
  const image_url = publicUrl(listing.image_path);

  // This payload matches what your admin page was inserting
  const insertPayload: any = {
    exporter_uuid: listing.exporter_uuid ?? null,
    title: listing.commodity ?? "Container Listing",
    route_from: listing.origin ?? null,
    route_to: listing.destination ?? null,
    container_type: listing.container_type ?? null,
    availability_date: listing.ready_date ?? null,
    qty: listing.quantity ?? null,
    price: listing.price ?? null,
    is_active: true,

    packaging: listing.packaging ?? null,
    whatsapp: listing.whatsapp ?? null,
    quantity_unit: listing.quantity_unit ?? null,
    currency: listing.currency ?? null,

    category: listing.category ?? null,
    market_location: listing.market_location ?? null,

    image_path: listing.image_path ?? null,
    image_url, // ✅ THIS is the missing one

    batch_id: listing.batch_id ?? null,
    incoterm: listing.incoterm ?? null,
    company_name: listing.company_name ?? null,
    contact_person: listing.contact_person ?? null,
  };

  const { error: insErr } = await supabaseAdmin.from("containers").insert([insertPayload]);
  if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });

  const { error: updErr } = await supabaseAdmin
    .from("container_listings")
    .update({ status: "approved", is_published: true })
    .eq("id", listingId);

  if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 200 });
}
