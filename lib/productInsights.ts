import { supabase } from "@/lib/supabase";

export type TrendPoint = {
  time: string;
  marketAvg: number;
  myPrice: number;
};

export type PriceSeriesStats = {
  min: number;
  max: number;
  changePct: number;
  avg: number;
};

export type TrendStats = {
  market: PriceSeriesStats;
  myveg: PriceSeriesStats;
};

export type InsightRange = "7D" | "1M" | "3M" | "6M" | "1Y" | "ALL";

/** Ordered range options shown in the trend dropdown. */
export const INSIGHT_RANGES: InsightRange[] = ["7D", "1M", "3M", "6M", "1Y", "ALL"];

/** Number of trailing days each range covers. ALL uses a wide 3-year window. */
export const RANGE_DAYS: Record<InsightRange, number> = {
  "7D": 7,
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  ALL: 1095,
};

export type ProductInsight = {
  id: string;
  slug: string | null;
  name: string;
  category: string | null;
  unit: string | null;
  packaging: string | null;
  image_url: string | null;
  market_price_aed: number | null;
  myveg_price_aed: number | null;
  origin_country: string | null;
  shipment_mode: string | null;
  price_note: string | null;
  updated_at: string | null;
  marketUpdatedAt: string | null;
  trend: TrendPoint[];
  stats: TrendStats;
};

function addDaysLocal(dateStr: string, days: number): string {
  try {
    if (!dateStr || typeof dateStr !== "string") throw new Error("invalid");
    const parts = dateStr.split("-").map(Number);
    if (parts.length < 3 || parts.some(isNaN)) throw new Error("invalid");
    const [y, m, d] = parts;
    const dt = new Date(y, m - 1, d);
    if (isNaN(dt.getTime())) throw new Error("invalid date");
    dt.setDate(dt.getDate() + days);
    if (isNaN(dt.getTime())) throw new Error("out of range");
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  } catch {
    const fallback = new Date();
    return `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, "0")}-${String(fallback.getDate()).padStart(2, "0")}`;
  }
}

function hashSeed(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

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
    out.push({ time: t, myPrice: +my.toFixed(2), marketAvg: +mk.toFixed(2) });
    t = addDaysLocal(t, 1);
  }
  return out;
}

export function computeSeriesStats(values: number[]): PriceSeriesStats {
  if (!values.length) {
    return { min: 0, max: 0, changePct: 0, avg: 0 };
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const first = values[0];
  const last = values[values.length - 1];
  const changePct = first ? ((last - first) / first) * 100 : 0;
  return {
    min: +min.toFixed(2),
    max: +max.toFixed(2),
    avg: +avg.toFixed(2),
    changePct: +changePct.toFixed(2),
  };
}

export function computeTrendStats(trend: TrendPoint[]): TrendStats {
  return {
    market: computeSeriesStats(trend.map((point) => point.marketAvg)),
    myveg: computeSeriesStats(trend.map((point) => point.myPrice)),
  };
}

export function filterTrendByRange(trend: TrendPoint[], range: InsightRange): TrendPoint[] {
  if (!trend.length) return [];
  return trend.slice(-RANGE_DAYS[range]);
}

function rangeToStartISO(range: InsightRange): string {
  try {
    const d = new Date();
    d.setSeconds(0, 0);
    d.setDate(d.getDate() - RANGE_DAYS[range]);
    if (isNaN(d.getTime())) throw new Error("out of range");
    return d.toISOString();
  } catch {
    // Fallback: 30 days ago
    const fallback = new Date();
    fallback.setDate(fallback.getDate() - 30);
    return fallback.toISOString();
  }
}

/** Rough transit time (days) inferred from the shipment mode, used for an ETA estimate. */
export function estimateArrivalDays(shipmentMode?: string | null): number {
  const mode = (shipmentMode || "").toLowerCase();
  if (mode.includes("air")) return 3;
  if (
    mode.includes("sea") ||
    mode.includes("ocean") ||
    mode.includes("ship") ||
    mode.includes("reefer") ||
    mode.includes("container")
  )
    return 21;
  if (mode.includes("road") || mode.includes("truck") || mode.includes("land")) return 5;
  return 7;
}

/** Estimated shipment arrival date derived from the shipment mode. */
export function expectedShipmentArrival(shipmentMode?: string | null): { label: string; days: number } {
  const days = estimateArrivalDays(shipmentMode);
  const arrival = new Date();
  arrival.setDate(arrival.getDate() + days);
  const label = arrival.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return { label, days };
}

async function fetchPriceHistory(productKey: string, range: InsightRange): Promise<TrendPoint[]> {
  const startISO = rangeToStartISO(range);
  const { data: rows, error } = await supabase
    .from("price_history")
    .select("price, published_at, source")
    .eq("product_key", productKey)
    .gte("published_at", startISO)
    .order("published_at", { ascending: true });

  if (error || !rows?.length) return [];

  const out: TrendPoint[] = rows
    .map((row: { price: number; published_at: string; source?: string | null }) => {
      const ts = row.published_at;
      const price = typeof row.price === "number" ? row.price : Number(row.price);
      if (!ts || !Number.isFinite(price)) return null;
      const source = String(row.source || "").toLowerCase();
      const isMarket = source === "al_aweer";
      return {
        time: new Date(ts).toISOString().slice(0, 10),
        marketAvg: isMarket ? price : NaN,
        myPrice: !isMarket ? price : NaN,
      };
    })
    .filter(Boolean) as TrendPoint[];

  let lastMarket: number | null = null;
  let lastMy: number | null = null;
  return out.map((point) => {
    if (Number.isFinite(point.marketAvg)) lastMarket = point.marketAvg;
    if (Number.isFinite(point.myPrice)) lastMy = point.myPrice;
    return {
      time: point.time,
      marketAvg: Number.isFinite(point.marketAvg) ? point.marketAvg : lastMarket ?? 0,
      myPrice: Number.isFinite(point.myPrice) ? point.myPrice : lastMy ?? 0,
    };
  });
}

async function fetchLatestMarketUpdate(productKey: string) {
  const { data: row } = await supabase
    .from("price_updates")
    .select("created_at, price")
    .eq("product_key", productKey)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return { marketUpdatedAt: null as string | null, marketPrice: null as number | null };
  const price = typeof row.price === "number" ? row.price : Number(row.price);
  return {
    marketUpdatedAt: row.created_at ?? null,
    marketPrice: Number.isFinite(price) ? price : null,
  };
}

async function fetchLegacyUpdates(productId: string, range: InsightRange): Promise<TrendPoint[]> {
  const startISO = rangeToStartISO(range);
  const { data: updates } = await supabase
    .from("price_updates")
    .select("price, created_at")
    .eq("published_product_id", productId)
    .eq("status", "approved")
    .gte("created_at", startISO)
    .order("created_at", { ascending: true });

  if (!updates?.length) return [];
  return updates.map((update: { price: number; created_at: string }) => ({
    time: update.created_at.slice(0, 10),
    marketAvg: Number(update.price),
    myPrice: Number(update.price),
  }));
}

export async function fetchProductInsight(
  productId: string,
  range: InsightRange = "1M"
): Promise<ProductInsight | null> {
  const { data: product, error } = await supabase
    .from("products")
    .select(
      "id,slug,name,category,unit,packaging,image_url,market_price_aed,myveg_price_aed,origin_country,shipment_mode,price_note,updated_at"
    )
    .eq("id", productId)
    .maybeSingle();

  if (error || !product) return null;

  const productKey = product.slug || product.id;
  const [{ marketUpdatedAt, marketPrice }, historyTrend, legacyTrend] = await Promise.all([
    fetchLatestMarketUpdate(productKey),
    fetchPriceHistory(productKey, range),
    fetchLegacyUpdates(productId, range),
  ]);

  const rawMarketPrice = marketPrice ?? product.market_price_aed;
  const effectiveMarket = rawMarketPrice != null && Number(rawMarketPrice) > 0 ? Number(rawMarketPrice) : 8.5;
  const effectiveMyVeg =
    product.myveg_price_aed != null && Number(product.myveg_price_aed) > 0
      ? Number(product.myveg_price_aed)
      : +(effectiveMarket * 0.94).toFixed(2);

  let trend = historyTrend.length > 0 ? historyTrend : legacyTrend;

  // Ensure every trend point has valid marketAvg and myPrice
  trend = trend.map((pt) => {
    const m = pt.marketAvg && pt.marketAvg > 0 ? pt.marketAvg : effectiveMarket;
    const v = pt.myPrice && pt.myPrice > 0 ? pt.myPrice : +(m * 0.94).toFixed(2);
    return {
      time: pt.time,
      marketAvg: +m.toFixed(2),
      myPrice: +v.toFixed(2),
    };
  });

  if (trend.length > 0) {
    trend[trend.length - 1].marketAvg = effectiveMarket;
    trend[trend.length - 1].myPrice = effectiveMyVeg;
  }

  const stats = computeTrendStats(trend);

  return {
    ...product,
    market_price_aed: effectiveMarket,
    myveg_price_aed: effectiveMyVeg,
    marketUpdatedAt,
    trend,
    stats,
  };
}

export function productImageUrl(imageUrl?: string | null, name?: string, category?: string | null) {
  if (imageUrl) {
    if (imageUrl.startsWith("http") || imageUrl.startsWith("/")) {
      return imageUrl.startsWith("/")
        ? `https://myvegmarket.com${imageUrl}`
        : imageUrl;
    }
  }
  const hay = `${name || ""} ${category || ""}`.toLowerCase();
  if (hay.includes("tomato")) return "https://myvegmarket.com/images/products/vegetables/tomato.jpeg";
  if (hay.includes("cucumber")) return "https://myvegmarket.com/images/products/vegetables/cucumber.jpeg";
  return "https://myvegmarket.com/images/products/vegetables/tomato.jpeg";
}

export function formatInsightUpdatedAt(value?: string | null) {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
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
