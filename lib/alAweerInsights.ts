import { supabase } from "@/lib/supabase";

/**
 * Al Aweer "lite" product insight logic — a faithful port of the production
 * website (myvegmarket.com/product/[slug]?lite=1) client code so the mobile
 * screen behaves identically: same queries, same stats math, same preview
 * chart path generator and the same trend-range normalization rules.
 */

export type TVPoint = { time: string; value: number };

export type TrendRangeKey = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "MAX";

/** Ordered range options shown in the trend overlay dropdown (labels match the site). */
export const TREND_RANGES: { key: TrendRangeKey; label: string }[] = [
  { key: "1D", label: "1 Day" },
  { key: "1W", label: "1 Week" },
  { key: "1M", label: "1 Month" },
  { key: "3M", label: "3 Months" },
  { key: "6M", label: "6 Months" },
  { key: "1Y", label: "1 Year" },
  { key: "MAX", label: "Max" },
];

/** Chart baseline starts from January 2026 (same lock as the website chart). */
export const CHART_START_DATE = "2026-01-01";

export type LiteProduct = {
  id: string;
  slug: string | null;
  name: string;
  category: string | null;
  unit: string | null;
  packaging: string | null;
  image_url: string | null;
  market_price_aed: number | null;
  origin_country: string | null;
  shipment_mode: string | null;
  updated_at: string | null;
};

export type LiteStats = {
  current: number;
  previous: number | null;
  highest: number;
  lowest: number;
  average: number;
  median: number;
  updates: number;
  from: string | null;
  to: string | null;
  changePercent: number | null;
};

export function formatAed(value: number | null | undefined): string {
  return value != null && Number.isFinite(value) ? `AED ${value.toFixed(2)}` : "—";
}

/** "25 Jul 2026" in Dubai time. */
export function formatDubaiDate(value?: string | null): string {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-GB", {
    timeZone: "Asia/Dubai",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** "25 Jul 2026, 8:00 am" in Dubai time (site's formatUpdatedAtDubai). */
export function formatDubaiDateTime(value?: string | null): string {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "—";
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

/** Site's formatPackaging, with the "Packaging:" prefix stripped for display. */
export function formatPackagingLabel(raw?: string | null): string {
  const p = (raw ?? "").trim();
  if (!p) return "Standard market packaging";
  if (/^packaging:/i.test(p)) {
    return p.replace(/^Packaging:\s*/i, "") || "Standard market packaging";
  }
  const m = p.match(/^\s*([\d.]+)\s*kg\s+(.+)\s*$/i);
  if (m) return `${m[2].trim()} (${m[1]} kg)`;
  return p;
}

/** Site's shipmentLabel — returns the display text for the mode. */
export function shipmentText(mode?: string | null): string | null {
  const m = (mode ?? "").toLowerCase().trim();
  if (m === "air") return "Air";
  if (m === "sea") return "Sea";
  if (m === "road") return "Road";
  if (m === "mixed") return "Mixed";
  return null;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Exact port of the website's stats memo: `current` is always the latest
 * override (price_updates) or stored market rate; the rest derive from the
 * full Al Aweer history series, with a current-rate-only fallback when the
 * history is empty.
 */
export function computeLiteStats(
  current: number,
  latestUpdateAt: string | null,
  history: TVPoint[]
): LiteStats {
  const values = history.map((p) => p.value);
  if (!values.length) {
    return {
      current,
      previous: null,
      highest: current,
      lowest: current,
      average: current,
      median: current,
      updates: 0,
      from: null,
      to: latestUpdateAt,
      changePercent: null,
    };
  }
  const previous = values.length > 1 ? values[values.length - 2] : values[0];
  const last = values[values.length - 1];
  return {
    current,
    previous,
    highest: Math.max(...values),
    lowest: Math.min(...values),
    average: values.reduce((sum, v) => sum + v, 0) / values.length,
    median: median(values),
    updates: values.length,
    from: history[0]?.time ?? null,
    to: history[history.length - 1]?.time ?? latestUpdateAt,
    changePercent: previous > 0 ? ((last - previous) / previous) * 100 : null,
  };
}

/** Site's preview chart path generator (520×180 viewBox, 24px bottom / 12px top padding). */
export function buildPreviewPath(
  series: TVPoint[],
  width = 520,
  height = 180
): string {
  if (!series.length) return "";
  const values = series.map((p) => p.value);
  const min = Math.min(...values);
  const span = Math.max(Math.max(...values) - min, 1);
  const step = series.length > 1 ? width / (series.length - 1) : 0;
  return series
    .map((p, i) => {
      const y = height - ((p.value - min) / span) * (height - 24) - 12;
      return `${i === 0 ? "M" : "L"} ${(i * step).toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function isISODateOnly(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function toISODate(dt: Date) {
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return toISODate(dt);
}

function addMonths(dateStr: string, months: number) {
  const [y, m] = dateStr.slice(0, 7).split("-").map(Number);
  const dt = new Date(y, m - 1 + months, 1);
  return toISODate(dt);
}

function sortByTime(series: TVPoint[]) {
  return [...(series ?? [])].sort((a, b) => a.time.localeCompare(b.time));
}

/**
 * Port of the website chart's normalizeForRange:
 * - daily ranges (1D/1W/1M): keep every point; carry-forward fill missing days
 *   for date-only datasets
 * - monthly ranges (3M/6M/1Y/MAX): one point per month (latest in month),
 *   continuous month spine
 * Points before the Jan-2026 chart baseline are dropped (falls back to the
 * unclamped series when that would empty it).
 */
export function normalizeForTrendRange(range: TrendRangeKey, raw: TVPoint[]): TVPoint[] {
  const s = sortByTime(raw);
  if (!s.length) return [];

  const isDaily = range === "1D" || range === "1W" || range === "1M";

  let out: TVPoint[];
  if (isDaily) {
    out = s.map((p) => ({ time: p.time, value: p.value }));
    const dateOnly = s.every((p) => isISODateOnly(p.time.slice(0, 10)));
    if (dateOnly) {
      const dayMap = new Map<string, number>();
      for (const p of s) dayMap.set(p.time.slice(0, 10), p.value);
      const first = s[0].time.slice(0, 10);
      const last = s[s.length - 1].time.slice(0, 10);
      const filled: TVPoint[] = [];
      let cur = first;
      let carry = dayMap.get(first) ?? s[0].value;
      for (let i = 0; i < 5000; i++) {
        const v = dayMap.get(cur);
        if (typeof v === "number") carry = v;
        filled.push({ time: cur, value: carry });
        if (cur === last) break;
        cur = addDays(cur, 1);
      }
      out = filled;
    }
  } else {
    const monthMap = new Map<string, TVPoint>();
    for (const p of s) {
      const m0 = p.time.slice(0, 7) + "-01";
      const prev = monthMap.get(m0);
      if (!prev || prev.time < p.time) monthMap.set(m0, { time: m0, value: p.value });
    }
    const firstMonth = s[0].time.slice(0, 7) + "-01";
    const lastMonth = s[s.length - 1].time.slice(0, 7) + "-01";
    const monthly: TVPoint[] = [];
    let cur = firstMonth;
    let carry = monthMap.get(cur)?.value ?? s[0].value;
    for (let i = 0; i < 240; i++) {
      const got = monthMap.get(cur);
      if (got) carry = got.value;
      monthly.push({ time: cur, value: carry });
      if (cur === lastMonth) break;
      cur = addMonths(cur, 1);
    }
    out = monthly;
  }

  const clamped = out.filter((p) => p.time.slice(0, 10) >= CHART_START_DATE);
  return clamped.length ? clamped : out;
}

export type AlAweerLiteData = {
  product: LiteProduct;
  /** Latest approved price_updates row for this product (site override). */
  marketUpdatedAt: string | null;
  marketPriceOverride: number | null;
  /** Full Al Aweer history (source = "al_aweer", price > 0), ascending. */
  history: TVPoint[];
};

/**
 * Mirrors the website's product page queries:
 * 1. products row by id
 * 2. latest price_updates row by product_key (created_at desc)
 * 3. full price_history where source = al_aweer
 */
export async function fetchAlAweerLiteProduct(productId: string): Promise<AlAweerLiteData | null> {
  const { data: product, error } = await supabase
    .from("products")
    .select(
      "id,slug,name,category,unit,packaging,image_url,market_price_aed,origin_country,shipment_mode,updated_at"
    )
    .eq("id", productId)
    .maybeSingle();

  if (error || !product) return null;

  const productKey = product.slug || product.id;

  const [{ data: updateRow }, { data: historyRows }] = await Promise.all([
    supabase
      .from("price_updates")
      .select("created_at, price")
      .eq("product_key", productKey)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("price_history")
      .select("price, published_at")
      .eq("product_key", productKey)
      .eq("source", "al_aweer")
      .order("published_at", { ascending: true }),
  ]);

  const marketUpdatedAt = updateRow?.created_at ?? null;
  const rawPrice = updateRow?.price;
  const marketPriceOverride =
    rawPrice != null && Number.isFinite(Number(rawPrice)) ? Number(rawPrice) : null;

  const history: TVPoint[] = (historyRows ?? [])
    .map((row: { price: number | string; published_at: string | null }) => {
      const ts = row.published_at;
      const price = typeof row.price === "number" ? row.price : Number(row.price);
      return ts && Number.isFinite(price) && price > 0 ? { time: ts, value: price } : null;
    })
    .filter(Boolean) as TVPoint[];

  return {
    product: product as LiteProduct,
    marketUpdatedAt,
    marketPriceOverride,
    history,
  };
}
