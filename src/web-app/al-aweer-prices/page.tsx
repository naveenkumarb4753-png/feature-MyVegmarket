import AlAweerPricesClient from "@/components/AlAweerPricesClient";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 60;

type ProductCategory = "vegetables" | "fruits" | "spices" | "nuts" | "eggs" | "oils";

type DbProduct = {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  unit: string;
  origin_country: string | null;
  packaging: string | null;
  active: boolean;
  sort_order: number;
};

type DayAgg = {
  min: number | null;
  max: number | null;
  last: number | null;
  lastTime: string | null;
};

function todayYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayRangeISO(ymd: string) {
  const [yy, mm, dd] = ymd.split("-").map((x) => Number(x));
  const start = new Date(yy, (mm || 1) - 1, dd || 1, 0, 0, 0, 0);
  const end = new Date(yy, (mm || 1) - 1, dd || 1, 23, 59, 59, 999);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anon, { auth: { persistSession: false } });
}

// ✅ helper: build agg map from ordered rows
function buildAggMapFromRows(rows: any[]) {
  const map: Record<string, DayAgg> = {};

  for (const r of rows ?? []) {
    const slug = String(r.product_key || "").trim();
    const price = Number(r.price);
    const t = (r.published_at || r.reviewed_at || null) as string | null;

    if (!slug || !Number.isFinite(price)) continue;

    if (!map[slug]) map[slug] = { min: price, max: price, last: price, lastTime: t };
    else {
      map[slug].min = map[slug].min == null ? price : Math.min(map[slug].min, price);
      map[slug].max = map[slug].max == null ? price : Math.max(map[slug].max, price);
      map[slug].last = price;
      map[slug].lastTime = t;
    }
  }

  return map;
}

export default async function AlAweerPricesPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string }> | { date?: string };
}) {
  const resolvedSearchParams = searchParams ? await Promise.resolve(searchParams) : {};
  const selectedDate = (resolvedSearchParams?.date || "").trim() || todayYMD();

  const supabase = getServerSupabase();

  // 1) products
  const { data: pData, error: pErr } = await supabase
    .from("products")
    .select("id,slug,name,category,unit,origin_country,packaging,active,sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(5000);

  const products: DbProduct[] = (pData as any) ?? [];
  const toast = pErr ? pErr.message : null;

  // 2) approved updates for selected day (same as your current)
  let aggBySlug: Record<string, DayAgg> = {};

  // ✅ NEW: carry-forward latest approved update per product up to selected day
  let carryAggBySlug: Record<string, DayAgg> = {};

  if (!pErr) {
    const { startISO, endISO } = dayRangeISO(selectedDate);

    // 2a) Selected day agg (min/max/last)
    const { data: uData, error: uErr } = await supabase
      .from("price_updates")
      .select("product_key,price,reviewed_at,published_at,status")
      .eq("status", "approved")
      .gte("published_at", startISO)
      .lte("published_at", endISO)
      .order("published_at", { ascending: true })
      .limit(10000);

    if (!uErr) {
      aggBySlug = buildAggMapFromRows((uData as any[]) ?? []);
    }

    // 2b) Carry-forward map
    // We want the latest approved row per product_key where published_at <= endISO
    // We'll fetch a reasonable recent window (e.g., last 120 days) to keep it fast.
    // If you want all-time, remove the gte filter (but can be heavy).
    const end = new Date(endISO);
    const startCarry = new Date(end);
    startCarry.setDate(startCarry.getDate() - 120);
    const startCarryISO = startCarry.toISOString();

    const { data: cData, error: cErr } = await supabase
      .from("price_updates")
      .select("product_key,price,reviewed_at,published_at,status")
      .eq("status", "approved")
      .gte("published_at", startCarryISO)
      .lte("published_at", endISO)
      .order("published_at", { ascending: false }) // latest first
      .limit(20000);

    if (!cErr) {
      // Build latest-per-slug, then convert to DayAgg (min=max=last=latest for carry)
      const latestMap: Record<string, { price: number; time: string | null }> = {};

      for (const r of (cData as any[]) ?? []) {
        const slug = String(r.product_key || "").trim();
        const price = Number(r.price);
        const t = (r.published_at || r.reviewed_at || null) as string | null;

        if (!slug || !Number.isFinite(price)) continue;
        if (latestMap[slug]) continue; // already got latest due to DESC order
        latestMap[slug] = { price, time: t };
      }

      const out: Record<string, DayAgg> = {};
      for (const [slug, v] of Object.entries(latestMap)) {
        out[slug] = { min: v.price, max: v.price, last: v.price, lastTime: v.time };
      }
      carryAggBySlug = out;
    }
  }

  return (
    <AlAweerPricesClient
      initialProducts={products}
      initialAggBySlug={aggBySlug}
      initialCarryAggBySlug={carryAggBySlug} // ✅ NEW
      initialDate={selectedDate}
      initialToast={toast}
    />
  );
}