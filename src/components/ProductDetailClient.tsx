"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DbProduct } from "@/lib/productsDb";
import type { TVPoint } from "@/components/ProductTrendTVChart";
import { getSupabase } from "@/lib/supabaseClient";

type RangeKey = React.ComponentProps<typeof ProductTrendTVChart>["range"];

// ✅ Lazy-load chart so product page loads faster (no "Loading..." text shown)
const ProductTrendTVChart = dynamic(() => import("@/components/ProductTrendTVChart"), {
  ssr: false,
  loading: () => null,
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// ✅ Support contacts
const SUPPORT_CALL_NUMBER = "7010220771";
// WhatsApp needs country code. Assuming India (+91). Change if needed.
const SUPPORT_WHATSAPP_NUMBER_E164 = "917010220771";

function storagePublicUrl(path?: string | null) {
  if (!path) return "";
  return `${SUPABASE_URL}/storage/v1/object/public/product_images/${path}`;
}

function safeImg(url?: string | null) {
  return (
    url ||
    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80"
  );
}

type TrendPoint = {
  time: string;
  marketAvg: number;
  myPrice: number; // kept for chart compatibility (we won't show MyVegMarket in UI)
};

function toTVSeries(data: TrendPoint[], key: "marketAvg" | "myPrice"): TVPoint[] {
  return data.map((d) => ({ time: d.time, value: d[key] }));
}

/** ---------------- DUMMY HISTORY GENERATOR ---------------- **/
function makeDummyHistory(opts: { start: string; days: number; seed: number }): TrendPoint[] {
  const { start, days } = opts;

  let s = opts.seed || 1234567;
  const rnd = () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };

  let t = start;

  let my = 6.8 + rnd() * 0.6;
  let mk = 9.5 + rnd() * 0.8;

  const out: TrendPoint[] = [];
  for (let i = 0; i < days; i++) {
    const season = Math.sin(i / 18) * 0.18 + Math.sin(i / 70) * 0.1;
    my += (rnd() - 0.5) * 0.08 + season * 0.22;
    mk += (rnd() - 0.5) * 0.1 + season * 0.3;

    my = Math.max(4.5, Math.min(12.0, my));
    mk = Math.max(6.0, Math.min(18.0, mk));

    out.push({
      time: t,
      myPrice: +my.toFixed(2),
      marketAvg: +mk.toFixed(2),
    });

    t = addDaysLocal(t, 1);
  }

  return out;
}

function addDaysLocal(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function hashSeed(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Shipment label + Material icon */
function shipmentLabel(mode?: string | null) {
  const m = (mode ?? "").toLowerCase().trim();
  if (m === "air") return { icon: "flight", text: "Air" };
  if (m === "sea") return { icon: "directions_boat", text: "Sea" };
  if (m === "road") return { icon: "local_shipping", text: "Road" };
  if (m === "mixed") return { icon: "swap_horiz", text: "Mixed" };
  return null;
}

function formatUpdatedAtDubai(d?: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;

  // Format in Dubai time
  return dt.toLocaleString("en-GB", {
    timeZone: "Asia/Dubai",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Optional: normalize packaging display */
function formatPackaging(raw?: string | null) {
  const p = (raw ?? "").trim();
  if (!p) return "";
  // If already starts with "Packaging:", keep it as-is
  if (/^packaging:/i.test(p)) return p;

  // Try to convert "3.1kg Mesh bag" -> "Packaging: Mesh bag (3.1 kg)"
  const m = p.match(/^\s*([\d.]+)\s*kg\s+(.+)\s*$/i);
  if (m) {
    const qty = m[1];
    const name = m[2].trim();
    return `Packaging: ${name} (${qty} kg)`;
  }

  return `Packaging: ${p}`;
}

export default function ProductDetailClient({
  product,
  isAlAweerLite = false,
}: {
  product: DbProduct;
  isAlAweerLite?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ✅ full-page trend controlled by URL param
  const trendOpen = searchParams.get("trend") === "1";

  // chart state
  const [range, setRange] = useState<RangeKey>("1M");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TrendPoint[]>([]);
  const [avgText, setAvgText] = useState("Avg: -");

  // ✅ DB-driven last updated for Al Aweer rate (from price_updates.created_at)
  const [marketUpdatedAt, setMarketUpdatedAt] = useState<string | null>(null);
  const [marketAvgFromDb, setMarketAvgFromDb] = useState<number | null>(null);

  // ✅ avoid window access during render (prevents hydration quirks)
  const [chartHeight, setChartHeight] = useState(560);
  useEffect(() => {
    const calc = () => setChartHeight(window.innerWidth < 640 ? 420 : 560);
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const title = product.name;
  const origin = product.origin_country ?? "UAE";
  const grade = "Regular"; // DB doesn't have grade yet (we can add later)
  const unit = product.unit ?? "kg";

  // ✅ Market-only for Price Analysis (DB override if found)
  const marketAvg = marketAvgFromDb ?? (product.market_price_aed ?? 0);

  const slugOrId = product.slug || product.id;

  // ✅ Pull shipment from DB (products.shipment_mode)
  const ship = shipmentLabel((product as any).shipment_mode);

  // ✅ Prefetch chart chunk BEFORE opening overlay (feels instant, no "loading" text)
  const openTrendPageFast = async () => {
    try {
      await import("@/components/ProductTrendTVChart");
    } catch {
      // ignore – overlay will still open, chart will load when ready
    }
    const qs = new URLSearchParams(searchParams.toString());
    qs.set("trend", "1");
    router.push(`${pathname}?${qs.toString()}`, { scroll: false });
  };

  const closeTrendPage = () => {
    const qs = new URLSearchParams(searchParams.toString());
    qs.delete("trend");
    const next = qs.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  // ✅ Load the LATEST DB price update for this product using:
  // - price_updates.product_key (text)
  // - price_updates.created_at (timestamptz)
  // - price_updates.price (numeric)
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    let cancelled = false;

    const run = async () => {
      try {
        // ✅ product_key is your identifier (most likely equals product.slug)
        const productKey = product.slug || product.id;

        const { data: row, error } = await supabase
          .from("price_updates")
          .select("created_at, price")
          .eq("product_key", productKey)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error("price_updates fetch error:", error);
          setMarketUpdatedAt(null);
          return;
        }
        if (!row) {
          console.warn("No price_updates row found for product_key:", productKey);
          setMarketUpdatedAt(null);
          return;
        }

        // ✅ last updated time
        setMarketUpdatedAt((row as any).created_at ?? null);

        // ✅ override market price from DB
        const p = (row as any).price;
        const num = typeof p === "number" ? p : Number(p);
        if (Number.isFinite(num)) setMarketAvgFromDb(num);
      } catch (e) {
        console.error("price_updates exception:", e);
        if (!cancelled) setMarketUpdatedAt(null);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [product.slug, product.id]);

 // ✅ Load REAL history from DB when opening trend page
useEffect(() => {
  if (!trendOpen) return;

  const supabase = getSupabase();
  if (!supabase) return;

  let cancelled = false;

  function rangeToStartISO(r: RangeKey) {
    const now = new Date();
    const d = new Date(now);
    d.setSeconds(0, 0);

    if (r === "1D") d.setDate(d.getDate() - 1);
    else if (r === "1W") d.setDate(d.getDate() - 7);
    else if (r === "1M") d.setMonth(d.getMonth() - 1);
    else if (r === "3M") d.setMonth(d.getMonth() - 3);
    else if (r === "6M") d.setMonth(d.getMonth() - 6);
    else if (r === "1Y") d.setFullYear(d.getFullYear() - 1);
    else return null; // MAX

    return d.toISOString();
  }

  const run = async () => {
    try {
      setLoading(true);

      const productKey = product.slug || product.id;
      const startISO = rangeToStartISO(range);

      let q = supabase
        .from("price_history")
        .select("price, published_at, source")
        .eq("product_key", productKey)
        .order("published_at", { ascending: true });

      if (startISO) q = q.gte("published_at", startISO);

      const { data: rows, error } = await q;

      if (cancelled) return;

      if (error) {
        console.error("price_history fetch error:", error);
        setData([]);
        setLoading(false);
        setAvgText("Avg: -");
        return;
      }

      const out: TrendPoint[] = (rows ?? [])
        .map((r: any) => {
          const ts = r.published_at || null;
          const p = typeof r.price === "number" ? r.price : Number(r.price);
          if (!ts || !Number.isFinite(p)) return null;

          const iso = new Date(ts).toISOString();
          const source = String(r.source || "").toLowerCase();
          const isMarket = source === "al_aweer";

          return {
            time: iso,
            marketAvg: isMarket ? p : NaN,
            myPrice: !isMarket ? p : NaN,
          };
        })
        .filter(Boolean) as TrendPoint[];

      // Fill forward market price so the line stays continuous
      let lastMarket: number | null = null;
      const filled: TrendPoint[] = out.map((pt) => {
        const mv = Number.isFinite(pt.marketAvg) ? pt.marketAvg : null;
        if (mv != null) lastMarket = mv;

        return {
          ...pt,
          marketAvg: mv != null ? mv : lastMarket ?? 0,
          myPrice: Number.isFinite(pt.myPrice) ? pt.myPrice : 0,
        };
      });

      setData(filled);
      setLoading(false);
      setAvgText("Avg: -");
    } catch (e) {
      console.error("price_history exception:", e);
      if (!cancelled) {
        setData([]);
        setLoading(false);
        setAvgText("Avg: -");
      }
    }
  };

  run();

  return () => {
    cancelled = true;
  };
}, [trendOpen, slugOrId, range]);

  // ESC closes full page
  useEffect(() => {
    if (!trendOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeTrendPage();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trendOpen]);

  // lock scroll when full page open
  useEffect(() => {
    if (!trendOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [trendOpen]);

  // ✅ Market series only (UI is market-only; chart can still accept myveg empty)
  const marketSeries = useMemo(() => toTVSeries(data, "marketAvg"), [data]);

  const onWhatsAppSupport = () => {
    const msg = encodeURIComponent(`Hi, I need support for ${title} (MyVegMarket).`);
    const url = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER_E164}?text=${msg}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const onCallSupport = () => {
    window.location.href = `tel:+91${SUPPORT_CALL_NUMBER}`;
  };

  return (
    <>
      {/* ✅ FULL PAGE TREND OVERLAY */}
      {trendOpen && (
        <div className="fixed inset-0 z-[9999] bg-[#f6f8f7]">
          <div className="h-full w-full px-4 sm:px-8 lg:px-16 pt-6 pb-6 overflow-hidden">
            {/* Premium Top bar */}
            <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[#111713] text-2xl sm:text-3xl font-black truncate">
                  {title}
                </div>
                <div className="text-[#648770] text-sm font-medium">
                  Al Aweer market trend
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-4">
                {/* Market Avg pill */}
                <div className="px-4 py-2 rounded-full bg-white border border-[#e0e8e3] text-[#111713] font-black text-sm">
                  {avgText}
                </div>

                {/* Close */}
                <button
                  onClick={closeTrendPage}
                  className="h-11 px-5 rounded-full bg-white border border-[#e0e8e3] text-[#111713] font-black hover:shadow-sm flex items-center gap-2"
                  title="Close"
                >
                  <span className="material-symbols-outlined">close</span>
                  Close
                </button>
              </div>
            </div>

            {/* Controls Row */}
            <div className="max-w-[1400px] mx-auto mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="text-xs font-black uppercase tracking-wider text-[#648770]">
                  Range
                </div>

                <select
                  value={range}
                  onChange={(e) => setRange(e.target.value as RangeKey)}
                  className="h-11 px-4 rounded-full bg-white border border-[#e0e8e3]
                       text-[#111713] font-black text-sm outline-none
                       focus:ring-2 focus:ring-[#1db954]/20"
                >
                  <option value="1D">1 Day</option>
                  <option value="1W">1 Week</option>
                  <option value="1M">1 Month</option>
                  <option value="3M">3 Months</option>
                  <option value="6M">6 Months</option>
                  <option value="1Y">1 Year</option>
                  <option value="MAX">Max</option>
                </select>
              </div>
            </div>

            {/* Chart Card */}
            <div className="max-w-[1400px] mx-auto mt-4 h-[calc(100vh-170px)] min-h-0">
              <div className="h-full rounded-[28px] bg-white border border-[#e0e8e3] shadow-sm p-4 sm:p-5 overflow-hidden">
                {loading || data.length === 0 ? (
                  <div className="h-full w-full rounded-2xl bg-[#f6f8f7] animate-pulse" />
                ) : (
                  <ProductTrendTVChart
                    title={`${title} - Market Price Trend`}
                    range={range}
                    myveg={[]} // ✅ keep hidden
                    market={marketSeries}
                    height={chartHeight}
                    onAvgTextChange={(text: string) => setAvgText(text || "Avg: -")}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ NORMAL PRODUCT DETAIL PAGE */}
      <main className="bg-[#f6f8f7] min-h-screen px-6 lg:px-20 pt-10 pb-24">
        <div className="max-w-[1300px] mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-[#648770] mb-6 font-medium">
            <Link className="hover:text-[#1db954]" href="/">
              Home
            </Link>
            <span className="material-symbols-outlined text-base">chevron_right</span>
            <Link className="hover:text-[#1db954]" href={`/products/${product.category}`}>
              Products
            </Link>
            <span className="material-symbols-outlined text-base">chevron_right</span>
            <span className="text-[#111713] font-bold">{title}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left */}
            <div className="lg:col-span-4 space-y-3">
              <div className="relative rounded-[28px] overflow-hidden border border-[#e0e8e3] shadow-sm bg-white">
                <div className="absolute top-4 left-4 z-10 bg-[#1db954] text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
                  Top Quality
                </div>

                <div className="aspect-square w-full bg-[#f0f4f2] flex items-center justify-center p-6">
                  <img
                    src={safeImg(storagePublicUrl((product as any)?.image_url || ""))}
                    alt={title}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80";
                    }}
                  />
                </div>
              </div>

              {/* ✅ SKU / Verified supplier removed completely */}
            </div>

            {/* Right */}
            <div className="lg:col-span-8 lg:-mt-2">
              <h1 className="text-[52px] leading-[1.05] font-black text-[#111713]">
                {title}
              </h1>

              <div className="mt-3 text-[#648770] font-medium">
                {/* Line 1: Origin + Grade + Unit */}
                <p className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">location_on</span>
                  <span>
                    Origin: {origin} • Grade: {grade} • Unit: {unit}
                  </span>
                </p>

                {/* Line 2: Shipment */}
                {ship && (
                  <p className="mt-1 flex items-center gap-2 text-[#648770] font-medium">
                    <span className="material-symbols-outlined text-base">{ship.icon}</span>
                    <span className="font-medium">Shipment:</span>
                    <span>{ship.text}</span>
                  </p>
                )}
              </div>

              {/* Price Analysis */}
              <div className="mt-7 bg-white border border-[#e0e8e3] p-6 rounded-[28px] shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black flex items-center gap-2 text-lg text-[#111713]">
                    <span className="material-symbols-outlined text-[#1db954]" aria-hidden="true">
                      analytics
                    </span>
                    Price Analysis
                  </h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                  {/* Left: market only */}
                  <div className="rounded-2xl border border-[#e0e8e3] bg-[#fbfcfb] p-5">
                    <div className="grid gap-4 grid-cols-1">
                      <div className="rounded-2xl bg-white border border-[#e0e8e3] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-[11px] font-black uppercase tracking-wider text-[#648770] mb-1">
                            AL AWEER RATE
                          </div>

                          <div className="text-[11px] font-semibold text-[#6b7280] whitespace-nowrap">
                            Last updated:{" "}
                            {marketUpdatedAt ? formatUpdatedAtDubai(marketUpdatedAt) : "—"}
                          </div>
                        </div>

                        <div className="text-2xl font-black text-[#111713]">
                          AED {marketAvg.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: trend preview */}
                  <button
                    type="button"
                    onClick={openTrendPageFast}
                    className="rounded-2xl bg-[#f6f8f7] border border-[#e0e8e3] p-5 flex flex-col justify-between text-left hover:shadow-md hover:shadow-black/5 transition"
                    title="Click to view full trend"
                  >
                    <div>
                      <div className="text-[11px] uppercase tracking-widest font-black text-[#111713]/45">
                        VIEW PRICE TREND
                      </div>
                      <div className="text-sm text-[#648770] font-medium mt-1">
                        View interactive market price chart (Al Aweer)
                      </div>
                    </div>

                    <div className="mt-3 relative h-[90px] rounded-xl bg-white border border-[#e0e8e3] overflow-hidden">
                      <svg viewBox="0 0 220 100" className="w-full h-full">
                        <path
                          d="M0,70 C35,35 70,85 110,55 C140,30 170,50 220,18"
                          fill="none"
                          stroke="#1db954"
                          strokeWidth="3"
                        />
                      </svg>
                    </div>
                  </button>
                </div>
              </div>

              {/* Chips */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-[#e0e8e3] rounded-2xl p-4 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-wider text-[#648770] mb-1">
                    Type
                  </p>
                  <p className="font-black text-[#111713]">{grade}</p>
                </div>

                <div className="bg-white border border-[#e0e8e3] rounded-2xl p-4 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-wider text-[#648770] mb-1">
                    Packaging
                  </p>
                  <p className="font-black text-[#111713]">
                    {formatPackaging((product as any).packaging)}
                  </p>
                </div>
              </div>

              {/* About */}
              <div className="mt-6">
                <h3 className="text-xl font-black text-[#111713] mb-2">
                  About the Produce
                </h3>
                <p className="text-[#648770] font-medium leading-7 max-w-2xl">
                  Premium quality produce sourced from verified partners. Consistent grading and reliable delivery for B2B customers.
                </p>
              </div>

              {/* Support Actions */}
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={onWhatsAppSupport}
                  className="flex-1 bg-[#1db954] text-white font-black py-4 rounded-full flex items-center justify-center gap-3 shadow-lg shadow-[#1db954]/20 hover:scale-[1.01] transition-transform active:scale-95"
                >
                  <span className="material-symbols-outlined">support_agent</span>
                  WhatsApp Support
                </button>

                <button
                  type="button"
                  onClick={onCallSupport}
                  className="flex-1 bg-white border border-[#1db954] text-[#1db954] font-black py-4 rounded-full flex items-center justify-center gap-3 hover:bg-[#1db954]/5 transition-colors"
                >
                  <span className="material-symbols-outlined">call</span>
                  Call Support
                </button>
              </div>
            </div>
          </div>

          {!isAlAweerLite && (
            <section className="mt-16 p-8 rounded-[30px] bg-[#edf4ef] border border-[#1db954]/10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-black mb-2 text-[#111713]">
                    Bulk Purchase Options
                  </h2>
                  <p className="text-[#648770] font-medium">
                    Are you a restaurant or hotel? Get tiered pricing for orders above 50kg.
                  </p>
                </div>

                <button className="bg-[#111713] text-white font-black px-8 py-3 rounded-full flex items-center gap-2 hover:opacity-90">
                  <span className="material-symbols-outlined">request_quote</span>
                  Request Quote
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                <div className="text-center p-4">
                  <p className="text-xs text-[#648770] font-black uppercase">10 - 50 KG</p>
                  <p className="text-lg font-black text-[#1db954]">AED 11.50</p>
                </div>

                <div className="text-center p-4 border-l border-[#d7e3dc]">
                  <p className="text-xs text-[#648770] font-black uppercase">50 - 200 KG</p>
                  <p className="text-lg font-black text-[#1db954]">AED 10.75</p>
                </div>

                <div className="text-center p-4 border-l border-[#d7e3dc]">
                  <p className="text-xs text-[#648770] font-black uppercase">200 - 500 KG</p>
                  <p className="text-lg font-black text-[#1db954]">AED 10.00</p>
                </div>

                <div className="text-center p-4 border-l border-[#d7e3dc]">
                  <p className="text-xs text-[#648770] font-black uppercase">500+ KG</p>
                  <p className="text-lg font-black text-[#1db954]">Custom</p>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}