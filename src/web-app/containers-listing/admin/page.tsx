"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type ListingRow = {
  id: string;
  exporter_uuid: string | null;
  email: string | null;
  whatsapp: string | null;

  category: string | null;
  market_location: string | null;
  image_path: string | null;
  batch_id: string | null;

  commodity: string | null;
  packaging: string | null;
  origin: string | null;
  destination: string | null;
  ready_date: string | null;
  container_type: string | null;

  quantity: number | null;
  quantity_unit: string | null;

  price: number | null;
  currency: string | null;

  incoterm: string | null;
  company_name: string | null;
  contact_person: string | null;

  status: string | null;
  created_at: string | null;
  is_published: boolean | null;
};

const BUCKET = "container_images";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function imgPublicUrl(path?: string | null) {
  if (!path) return "";
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

/** ✅ Outer component only provides Suspense boundary (required for useSearchParams) */
export default function AdminPublishPage() {
  return (
    <Suspense fallback={<div className="p-6 font-bold">Loading…</div>}>
      <AdminPublishPageInner />
    </Suspense>
  );
}

/** ✅ Inner component contains your original code (UNCHANGED UI/logic) */
function AdminPublishPageInner() {
  const params = useSearchParams();
  const secret = (params.get("secret") ?? "").trim();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ListingRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const isAllowed = useMemo(() => {
    const expected = (process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "").trim();
    if (!expected) return false;
    return secret.length > 0 && secret === expected;
  }, [secret]);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch(
        `/api/admin/container-publish?secret=${encodeURIComponent(secret)}`,
        {
          method: "GET",
        }
      );
      const json = await res.json();

      if (!json?.ok) {
        setErr(json?.error ?? "Failed to load");
        setRows([]);
      } else {
        // only show pending in UI
        const all: ListingRow[] = (json.rows ?? []) as any;
        setRows(all.filter((r) => (r.status ?? "").toLowerCase() === "pending"));
      }
    } catch (e: any) {
      setErr(e?.message ?? "Fetch failed");
      setRows([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!isAllowed) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAllowed]);

  async function act(listingId: string, action: "approve" | "reject") {
    setErr(null);
    try {
      const res = await fetch(`/api/admin/container-publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, listingId, action }),
      });
      const json = await res.json();

      if (!json?.ok) {
        setErr(json?.error ?? "Action failed");
        return;
      }

      await load();
      alert(action === "approve" ? "✅ Approved & Published!" : "✅ Rejected!");
    } catch (e: any) {
      setErr(e?.message ?? "Fetch failed");
    }
  }

  if (!isAllowed) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-[#f6f8f7] px-4 sm:px-6 lg:px-12 py-10">
        <div className="max-w-[1100px] mx-auto bg-white border border-[#e0e8e3] rounded-[28px] p-8">
          <h1 className="text-2xl font-black text-[#111713]">Admin blocked</h1>
          <p className="mt-2 text-[#648770] font-medium">
            Set <b>NEXT_PUBLIC_ADMIN_SECRET</b> in <b>.env.local</b> and open:
            <b> /containers-listing/admin?secret=YOUR_SECRET</b>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#f6f8f7] px-4 sm:px-6 lg:px-12 py-10">
      <div className="max-w-[1100px] mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/containers-listing/list"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#648770] hover:text-[#1db954] transition"
          >
            <span className="text-base">←</span>
            Back to Home
          </Link>

          <button
            onClick={load}
            className="h-11 px-5 rounded-full bg-white border border-[#e0e8e3] font-black text-[#111713] hover:bg-[#f6f8f7]"
          >
            Refresh
          </button>
        </div>

        <section className="bg-white border border-[#e0e8e3] rounded-[32px] px-6 sm:px-10 py-10 shadow-[0_8px_30px_rgba(17,23,19,0.06)]">
          <h1 className="text-3xl sm:text-4xl font-black text-[#111713]">
            Pending Container Listings
          </h1>
          <p className="mt-2 text-[#648770] font-medium">
            Approve → copies row into <b>containers</b> (and fills <b>image_url</b>). Reject → marks rejected.
          </p>

          {err && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700 font-semibold">
              {err}
            </div>
          )}

          {loading ? (
            <div className="mt-8 text-[#111713] font-bold">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="mt-8 text-[#648770] font-semibold">No pending listings right now.</div>
          ) : (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
              {rows.map((r) => {
                const img =
                  imgPublicUrl(r.image_path) ||
                  "https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=1400&q=80";

                return (
                  <div key={r.id} className="bg-white border border-[#e0e8e3] rounded-[26px] overflow-hidden shadow-sm">
                    <div className="h-[180px] bg-[#eef2f0]">
                      <img src={img} alt={r.commodity ?? "listing"} className="w-full h-full object-cover" />
                    </div>

                    <div className="p-6">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {r.category && (
                          <span className="px-3 py-1 rounded-full bg-[#eaf7ef] text-[#1db954] font-black text-xs border border-[#bfe8cd]">
                            {r.category}
                          </span>
                        )}
                        {r.market_location && (
                          <span className="px-3 py-1 rounded-full bg-[#eef2f0] text-[#111713] font-black text-xs border border-[#e0e8e3]">
                            {r.market_location}
                          </span>
                        )}
                        {r.batch_id && (
                          <span className="px-3 py-1 rounded-full bg-white text-[#648770] font-black text-xs border border-[#e0e8e3]">
                            Batch: {String(r.batch_id).slice(0, 8)}
                          </span>
                        )}
                      </div>

                      <div className="text-xl font-black text-[#111713]">{r.commodity ?? "—"}</div>
                      <div className="mt-2 text-sm text-[#648770] font-semibold">
                        {r.origin ?? "—"} → {r.destination ?? "—"} • {r.container_type ?? "—"} • Ready: {r.ready_date ?? "—"}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-[#f6f8f7] border border-[#e0e8e3] p-4">
                          <div className="text-xs font-black text-[#8aa59a]">QTY</div>
                          <div className="text-lg font-black text-[#111713]">
                            {r.quantity ?? "—"} {r.quantity_unit ?? ""}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-[#f6f8f7] border border-[#e0e8e3] p-4">
                          <div className="text-xs font-black text-[#8aa59a]">PRICE</div>
                          <div className="text-lg font-black text-[#111713]">
                            {r.currency ?? "—"} {r.price ?? "—"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 text-sm text-[#111713] font-semibold">Packaging: {r.packaging ?? "—"}</div>

                      <div className="mt-5 flex gap-3">
                        <button
                          onClick={() => act(r.id, "approve")}
                          className="flex-1 rounded-full h-12 bg-[#1db954] text-white font-black hover:brightness-110 transition"
                        >
                          Approve & Publish
                        </button>
                        <button
                          onClick={() => act(r.id, "reject")}
                          className="rounded-full h-12 px-6 bg-white border border-[#e0e8e3] text-[#111713] font-black hover:bg-[#f6f8f7] transition"
                        >
                          Reject
                        </button>
                      </div>

                      <div className="mt-3 text-xs text-[#8aa59a] font-semibold">Listing ID: {r.id}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}