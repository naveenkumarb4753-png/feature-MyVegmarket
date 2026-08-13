"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";

type DbProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  unit: string | null;
  origin_country: string | null;
  packaging: string | null;
  active: boolean;
};

type ContainerRow = {
  id: string;
  title: string | null;

  route_from: string | null; // origin pill (country)
  route_to: string | null; // not shown

  container_type: string | null; // not shown
  availability_date: string | null; // not shown

  qty: number | null;
  price: number | null;
  currency: string | null;

  packaging: string | null;
  whatsapp: string | null;

  category: string | null; // not shown
  market_location: string | null; // shown in pill

  image_url: string | null;
  image_path: string | null;

  is_active: boolean | null;
  created_at: string | null;
};

const PRODUCTS_TABLE = "products";
const CONTAINERS_TABLE = "containers";

const CONTAINERS_BUCKET = "container_images";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function requireSupabase() {
  const s = getSupabase();
  if (!s) {
    alert(
      "Supabase not configured. Check NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
    return null;
  }
  return s;
}

function capFirst(s?: string | null) {
  const t = String(s ?? "").trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

function containerImgUrl(row: ContainerRow) {
  if (row.image_url) return row.image_url;
  if (row.image_path) {
    return `${SUPABASE_URL}/storage/v1/object/public/${CONTAINERS_BUCKET}/${row.image_path}`;
  }
  return "https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=1400&q=80";
}

function formatMoney(currency?: string | null, price?: number | null) {
  const c = (currency ?? "").trim();
  const p = Number(price);
  const ok = Number.isFinite(p);
  if (!c && !ok) return "—";
  if (!c) return ok ? `${p.toFixed(2)}` : "—";
  if (!ok) return `${c} —`;
  return `${c} ${p.toFixed(2)}`;
}

function cleanWa(w?: string | null) {
  return String(w ?? "").replace(/\D/g, "");
}

export default function ProductContainersPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const slug = String(params?.slug ?? "");
  const back = searchParams.get("back");
  const backHref = back ? back : "/";

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<DbProduct | null>(null);
  const [containers, setContainers] = useState<ContainerRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const productName = useMemo(() => (product?.name ?? "").trim(), [product]);

  useEffect(() => {
    if (!slug) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function load() {
    const supabase = requireSupabase();
    if (!supabase) return;

    setLoading(true);
    setErr(null);

    const { data: p, error: pErr } = await supabase
      .from(PRODUCTS_TABLE)
      .select("id,slug,name,category,unit,origin_country,packaging,active")
      .eq("slug", slug)
      .maybeSingle();

    if (pErr) {
      setErr(pErr.message);
      setLoading(false);
      return;
    }

    const prod = (p as any) ?? null;
    setProduct(prod);

    if (!prod?.name) {
      setContainers([]);
      setLoading(false);
      return;
    }

    const name = String(prod.name).trim();

    const { data: c, error: cErr } = await supabase
      .from(CONTAINERS_TABLE)
      .select(
        "id,title,route_from,route_to,container_type,availability_date,qty,price,currency,packaging,whatsapp,category,market_location,image_url,image_path,is_active,created_at"
      )
      .eq("is_active", true)
      .ilike("title", `%${name}%`)
      .order("created_at", { ascending: false });

    if (cErr) {
      setErr(cErr.message);
      setContainers([]);
      setLoading(false);
      return;
    }

    setContainers(((c as any) ?? []) as ContainerRow[]);
    setLoading(false);
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#f6f8f7] px-4 sm:px-6 lg:px-12 py-10">
      <div className="max-w-[1400px] mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#648770] hover:text-[#1db954] transition"
          >
            <span className="text-base">←</span>
            Back
          </Link>

          <button
            onClick={load}
            className="h-11 px-5 rounded-full bg-white border border-[#e0e8e3] font-black text-[#111713] hover:bg-[#f6f8f7]"
          >
            Refresh
          </button>
        </div>

        {/* Header (NO big outer box now) */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#111713] leading-[1.05]">
            {productName ? `Containers for ${productName}` : "Containers"}
          </h1>
          <p className="mt-2 text-[#648770] font-medium">
            Showing active container offers related to this product.
          </p>

          {err && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700 font-semibold">
              {err}
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-[#111713] font-bold">Loading…</div>
        ) : containers.length === 0 ? (
          <div className="text-[#648770] font-semibold">
            No containers found for {productName || "this product"} yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {containers.map((c) => {
              const img = containerImgUrl(c);
              const wa = cleanWa(c.whatsapp);

              const title = (c.title ?? productName ?? "—").trim();
              const marketLoc = (c.market_location ?? "").trim();
              const packaging = (c.packaging ?? "").trim();
              const originPill = capFirst(c.route_from);

              return (
                <div
                  key={c.id}
                  className="group bg-white border border-[#e0e8e3] rounded-[28px] overflow-hidden shadow-sm hover:shadow-xl transition-all"
                >
                  {/* Image */}
                  <div className="relative h-[230px] bg-white overflow-hidden">
                    <img
                      src={img}
                      alt={title}
                      className="w-full h-full object-contain p-6 bg-white group-hover:scale-[1.01] transition-transform duration-500"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=1400&q=80";
                      }}
                    />

                    {/* Country pill (Origin) */}
                    <div className="absolute top-4 left-4">
                      <span className="inline-flex items-center rounded-full bg-white/95 backdrop-blur border border-[#e0e8e3] px-3 py-1 text-xs font-black text-[#111713] shadow-sm">
                        {originPill || "—"}
                      </span>
                    </div>
                  </div>

                  <div className="p-7">
                    {/* Product name */}
                    <div className="text-[22px] font-black text-[#111713] leading-tight">
                      {title}
                    </div>

                    {/* Location + Packaging (NO CUT, wrap allowed, same height) */}
                   {/* Location + Packaging (responsive, no overflow) */}
<div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
  <div className="min-h-[44px] min-w-0 rounded-2xl bg-[#f6f8f7] border border-[#e0e8e3] px-4 py-2 flex items-start gap-2">
    <span className="text-sm font-semibold text-[#648770] whitespace-nowrap pt-[1px]">
      Location:
    </span>
    <span className="min-w-0 text-sm font-black text-[#111713] leading-snug break-words">
      {marketLoc || "—"}
    </span>
  </div>

  <div className="min-h-[44px] min-w-0 rounded-2xl bg-[#f6f8f7] border border-[#e0e8e3] px-4 py-2 flex items-start gap-2">
    <span className="text-sm font-semibold text-[#648770] whitespace-nowrap pt-[1px]">
      Packaging:
    </span>
    <span className="min-w-0 text-sm font-black text-[#111713] leading-snug break-words">
      {packaging || "—"}
    </span>
  </div>
</div>


                    {/* Quantity + Price */}
                   {/* Quantity + Price (responsive, no overflow) */}
<div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div className="rounded-2xl bg-[#f6f8f7] border border-[#e0e8e3] p-5">
    <div className="text-[11px] font-black text-[#8aa59a] uppercase tracking-wide">
      Quantity
    </div>
    <div className="mt-2 text-[20px] font-black text-[#111713] tabular-nums break-words">
      {c.qty ?? "—"}
    </div>
  </div>

  <div className="rounded-2xl bg-[#f6f8f7] border border-[#e0e8e3] p-5">
    <div className="text-[11px] font-black text-[#8aa59a] uppercase tracking-wide">
      Price
    </div>
    <div className="mt-2 text-[20px] font-black text-[#111713] tabular-nums whitespace-nowrap">
      {formatMoney(c.currency, c.price)}
    </div>
  </div>
</div>


                    {/* WhatsApp */}
                    {wa ? (
                      <a
                        className="mt-6 inline-flex w-full items-center justify-center rounded-full h-12 bg-[#1db954] text-white font-black hover:brightness-110 transition"
                        href={`https://wa.me/${wa}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp Seller
                      </a>
                    ) : (
                      <div className="mt-6 inline-flex w-full items-center justify-center rounded-full h-12 bg-white border border-[#e0e8e3] text-[#8aa59a] font-black">
                        WhatsApp not available
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
