"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState, useRef, useEffect } from "react";

type ProductCategory = "vegetables" | "fruits" | "spices" | "nuts" | "eggs" | "oils";

const ALL_CATEGORIES: ProductCategory[] = [
  "vegetables",
  "fruits",
  "spices",
  "nuts",
  "eggs",
  "oils",
];

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

type RowVM = {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  unit: string; // kept for search compatibility
  origin: string;

  // ✅ NEW: pack size (only weight like 3kg)
  pack: string | null;

  minPrice: number | null;
  maxPrice: number | null;
  marketPrice: number | null;
  lastTimeLabel: string | null;

  carried?: boolean;
};

function labelCat(c: ProductCategory) {
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function formatPrice(n: number | null | undefined) {
  if (n === null || n === undefined) return "NA";
  const num = Number(n);
  if (!Number.isFinite(num)) return "NA";
  return num.toFixed(2);
}

// ✅ only show weight (3kg, 3.8kg, 500g). If missing -> NA
function formatPack(p?: string | null) {
  const v = (p ?? "").trim();
  if (!v) return "NA";
  const m = v.match(/(\d+(?:\.\d+)?)\s*(kg|g)\b/i);
  if (!m) return "NA";
  return `${m[1]}${m[2].toLowerCase()}`;
}

// ✅ stable formatting (no hydration mismatch)
function fmtTimeOnly(iso: string | null) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;

    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;

    const mm = String(m).padStart(2, "0");
    return `${h}:${mm} ${ampm}`;
  } catch {
    return null;
  }
}

/**
 * ✅ Share only on PHONES.
 * Tablets + Desktop should download.
 */
function isPhoneDevice() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isiPhoneOrIPod = /iPhone|iPod/i.test(ua);
  const isAndroidPhone = /Android/i.test(ua) && /Mobile/i.test(ua);
  return isiPhoneOrIPod || isAndroidPhone;
}

function downloadBlob(blob: Blob, filename: string) {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

export default function AlAweerPricesClient({
  initialProducts,
  initialAggBySlug,
  initialCarryAggBySlug,
  initialDate,
  initialToast,
}: {
  initialProducts: DbProduct[];
  initialAggBySlug: Record<string, DayAgg>;
  initialCarryAggBySlug: Record<string, DayAgg>;
  initialDate: string;
  initialToast: string | null;
}) {
  const router = useRouter();

  const openProduct = (slug: string) => {
    router.push(`/product/${slug}?lite=1`);
  };

  const [toast, setToast] = useState<string | null>(initialToast);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);

  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState("All");

  const [selectedCats, setSelectedCats] = useState<ProductCategory[]>([...ALL_CATEGORIES]);
  const [catOpen, setCatOpen] = useState(false);
  const catRef = useRef<HTMLDivElement | null>(null);

  const products = initialProducts;
  const aggBySlug = initialAggBySlug;
  const carryAggBySlug = initialCarryAggBySlug;

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!catRef.current) return;
      if (!catRef.current.contains(e.target as Node)) setCatOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const origins = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) set.add((p.origin_country || "—").trim() || "—");
    return ["All", ...Array.from(set)];
  }, [products]);

  const showOriginFilter = useMemo(() => origins.length > 2, [origins]);

  const selectedCatsText = useMemo(() => {
    if (selectedCats.length === ALL_CATEGORIES.length) return "All";
    if (selectedCats.length === 0) return "None";
    return selectedCats.map(labelCat).join(", ");
  }, [selectedCats]);

  const handleToggleCategory = (c: ProductCategory) => {
    setSelectedCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };
  const handleSelectAllCats = () => setSelectedCats([...ALL_CATEGORIES]);
  const handleClearCats = () => setSelectedCats([]);

  const isEmptyAgg = (a?: DayAgg) => !a || (a.min == null && a.max == null && a.last == null);

  const rows: RowVM[] = useMemo(() => {
    const list: RowVM[] = products.map((p) => {
      const dayAgg = aggBySlug[p.slug];
      const carryAgg = carryAggBySlug[p.slug];

      const useCarry = isEmptyAgg(dayAgg) && !isEmptyAgg(carryAgg);
      const agg = useCarry
        ? (carryAgg as DayAgg)
        : dayAgg || { min: null, max: null, last: null, lastTime: null };

      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        category: p.category,
        unit: p.unit,
        origin: (p.origin_country || "—").trim() || "—",
        pack: p.packaging,
        minPrice: agg.min,
        maxPrice: agg.max,
        marketPrice: agg.last,
        lastTimeLabel: fmtTimeOnly(agg.lastTime),
        carried: useCarry,
      };
    });

    let filtered = list.filter((p) => selectedCats.includes(p.category));

    if (search.trim()) {
      const s = search.toLowerCase();
      filtered = filtered.filter((p) => {
        const subtitle = `${p.pack ?? ""} ${p.unit ?? ""}`.toLowerCase();
        return p.name.toLowerCase().includes(s) || subtitle.includes(s) || p.origin.toLowerCase().includes(s);
      });
    }

    if (showOriginFilter && origin !== "All") filtered = filtered.filter((p) => p.origin === origin);

    filtered.sort((a, b) => {
      const av = a.marketPrice == null ? Number.POSITIVE_INFINITY : a.marketPrice;
      const bv = b.marketPrice == null ? Number.POSITIVE_INFINITY : b.marketPrice;
      return av - bv;
    });

    return filtered;
  }, [products, aggBySlug, carryAggBySlug, selectedCats, search, showOriginFilter, origin]);

  const handleDownloadPdf = async () => {
    const qs = new URLSearchParams({
      search,
      origin,
      cats: selectedCats.join(","),
      date: selectedDate,
    });

    const url = `/api/al-aweer-report?${qs.toString()}`;
    const filename = "myvegmarket-al-aweer-price-report.pdf";

    try {
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const blob = await res.blob();

      if (isPhoneDevice()) {
        try {
          const file = new File([blob], filename, { type: "application/pdf" });
          // @ts-ignore
          if (navigator.canShare?.({ files: [file] })) {
            // @ts-ignore
            await navigator.share({
              files: [file],
              title: "MyVegMarket Price Report",
              text: "Al Aweer Price Report (PDF)",
            });
            return;
          }
        } catch {}
      }

      downloadBlob(blob, filename);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const onDateChange = (v: string) => {
    setToast(null);
    setSelectedDate(v);
    router.replace(`/al-aweer-prices?date=${encodeURIComponent(v)}`, { scroll: false });
  };

  return (
    <main className="bg-[#f6f8f7] min-h-screen px-6 lg:px-20 pt-10 pb-24">
      <div className="max-w-[1400px] mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm font-medium text-[#648770] mb-6">
          <Link className="hover:text-[#1db954]" href="/">
            Home
          </Link>
          <span className="material-symbols-outlined text-base">chevron_right</span>
          <span className="text-[#111713] font-bold">Al Aweer Prices</span>
        </div>

        {/* Heading + PDF */}
        <div className="flex flex-wrap justify-between items-end gap-6 mb-8">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-black tracking-tight text-[#111713] leading-[1.05]">
              Al Aweer Prices
            </h1>
            <p className="text-[#648770] text-lg font-medium mt-3 max-w-xl">
              Approved on: <span className="font-bold text-[#111713]">{selectedDate}</span> • Verified daily market reference: Min/Max, latest rate (AED), and update time.
            </p>

            {toast && (
              <div className="mt-3 bg-white border border-[#e0e8e3] rounded-xl px-4 py-3 text-[#111713] font-semibold">
                {toast}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 rounded-full h-12 px-6 bg-white border border-[#e0e8e3] text-[#111713] font-bold shadow-sm hover:shadow-md transition-all"
          >
            <span className="material-symbols-outlined">download</span>
            <span>Price Report (PDF)</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white text-[#111713] rounded-2xl p-4 mb-10 shadow-sm border border-[#e0e8e3]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
            {/* Search */}
            <div className="relative w-full lg:flex-[2] min-w-0">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#648770]">
                search
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="h-11 w-full rounded-full bg-[#f0f4f2] pl-12 pr-4 text-sm font-semibold text-[#111713] placeholder:text-[#648770] outline-none focus:ring-2 focus:ring-[#0B5D1E]/20"
              />
            </div>

            {/* Categories dropdown */}
            <div className="relative w-full lg:flex-[2] min-w-0" ref={catRef}>
              <button
                type="button"
                onClick={() => setCatOpen((v) => !v)}
                className="h-11 w-full rounded-full bg-[#f0f4f2] px-4 text-sm font-semibold outline-none flex items-center justify-between gap-2 text-[#111713] focus:ring-2 focus:ring-[#0B5D1E]/20"
              >
                <span className="truncate">
                  Category:{" "}
                  {selectedCats.length === ALL_CATEGORIES.length
                    ? "All"
                    : selectedCats.length === 0
                    ? "None"
                    : `${selectedCats.length} selected`}
                </span>
                <span className="material-symbols-outlined text-[18px] text-[#648770] shrink-0">
                  expand_more
                </span>
              </button>

              {catOpen && (
                <div className="absolute z-20 mt-2 w-full sm:w-[320px] rounded-2xl border border-[#e0e8e3] bg-white shadow-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-[#111713]">Select Categories</span>
                    <button
                      type="button"
                      onClick={() => setCatOpen(false)}
                      className="text-[#648770] hover:text-[#111713]"
                      aria-label="Close"
                    >
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  </div>

                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={handleSelectAllCats}
                      className="h-9 px-3 rounded-full border border-[#e0e8e3] bg-white text-sm font-bold hover:bg-[#f6f8f7]"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearCats}
                      className="h-9 px-3 rounded-full border border-[#e0e8e3] bg-white text-sm font-bold hover:bg-[#f6f8f7]"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="space-y-2">
                    {ALL_CATEGORIES.map((c) => {
                      const checked = selectedCats.includes(c);
                      return (
                        <label
                          key={c}
                          className="flex items-center gap-3 text-sm font-semibold text-[#111713] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleCategory(c)}
                            className="h-4 w-4 accent-[#1db954]"
                          />
                          {labelCat(c)}
                        </label>
                      );
                    })}
                  </div>

                  <div className="mt-3 text-[12px] font-semibold text-[#648770] break-words">
                    Selected: {selectedCatsText}
                  </div>
                </div>
              )}
            </div>

            {/* Origin */}
            {showOriginFilter && (
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="h-11 w-full lg:flex-[1.2] rounded-full bg-[#f0f4f2] px-4 text-sm font-semibold text-[#111713] outline-none focus:ring-2 focus:ring-[#0B5D1E]/20"
              >
                {origins.map((o) => (
                  <option key={o} value={o}>
                    Origin: {o}
                  </option>
                ))}
              </select>
            )}

            {/* Date */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="h-11 w-full lg:w-[220px] rounded-full bg-[#f0f4f2] px-4 text-sm font-semibold text-[#111713] outline-none focus:ring-2 focus:ring-[#0B5D1E]/20"
            />

            {/* Results */}
            <div className="text-sm font-medium text-[#648770] lg:ml-auto lg:text-right whitespace-nowrap">
              Showing {rows.length} results
            </div>
          </div>
        </div>

        {/* DESKTOP */}
        <div className="hidden md:block bg-white border border-[#e0e8e3] rounded-2xl overflow-hidden shadow-sm">
          {/* ✅ Added Pack column between Origin and MIN */}
          <div className="grid grid-cols-[3fr_1.5fr_0.8fr_1fr_1fr_1.2fr_1fr] gap-0 bg-green-600 text-white text-sm font-semibold">
            <div className="px-5 py-3">Product</div>
            <div className="px-5 py-3">Origin</div>
            <div className="px-5 py-3 text-right">Pack</div>
            <div className="px-5 py-3 text-right">MIN</div>
            <div className="px-5 py-3 text-right">MAX</div>
            <div className="px-5 py-3 text-right">Market (AED)</div>
            <div className="px-5 py-3 text-right">Time</div>
          </div>

          {rows.map((p, idx) => (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => openProduct(p.slug)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") openProduct(p.slug);
              }}
              className={`grid grid-cols-[3fr_1.5fr_0.8fr_1fr_1fr_1.2fr_1fr] gap-0 text-sm cursor-pointer transition-colors
                ${idx % 2 === 0 ? "bg-white" : "bg-[#f6f8f7]"}
                hover:bg-[#eaf3ee] focus:outline-none focus:ring-2 focus:ring-[#0B5D1E]/15`}
            >
              <div className="px-5 py-3 font-semibold text-[#111713]">{p.name}</div>
              <div className="px-5 py-3 text-[#111713]">{p.origin}</div>

              <div className="px-5 py-3 text-right font-extrabold tabular-nums text-[#111713]">
                {formatPack(p.pack)}
              </div>

              <div className="px-5 py-3 text-right font-extrabold tabular-nums text-[#111713]">
                {formatPrice(p.minPrice)}
              </div>

              <div className="px-5 py-3 text-right font-extrabold tabular-nums text-[#111713]">
                {formatPrice(p.maxPrice)}
              </div>

              <div className="px-5 py-3 text-right font-extrabold tabular-nums text-[#111713]">
                {formatPrice(p.marketPrice)}
              </div>

              <div className="px-5 py-3 text-right font-semibold tabular-nums text-[#111713]">
                {p.lastTimeLabel || "NA"}
              </div>
            </div>
          ))}
        </div>

        {/* MOBILE */}
        <div className="md:hidden space-y-3">
          {rows.map((p) => (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => openProduct(p.slug)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") openProduct(p.slug);
              }}
              className="bg-white border border-[#e0e8e3] rounded-2xl p-4 shadow-sm cursor-pointer
                         hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-[#0B5D1E]/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-extrabold text-[#111713] leading-tight">{p.name}</div>
                  <div className="mt-1 text-sm font-semibold text-[#648770]">{p.origin}</div>

                  {/* ✅ Pack shown on mobile too */}
                  <div className="mt-1 text-xs font-semibold text-[#648770]">
                    Pack: <span className="text-[#111713] font-extrabold">{formatPack(p.pack)}</span>
                  </div>

                  <div className="mt-2 text-xs font-semibold text-[#648770]">
                    MIN:{" "}
                    <span className="text-[#111713] font-extrabold tabular-nums">
                      {formatPrice(p.minPrice)}
                    </span>{" "}
                    • MAX:{" "}
                    <span className="text-[#111713] font-extrabold tabular-nums">
                      {formatPrice(p.maxPrice)}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-[#6B7C72]">
                    Market (AED)
                  </div>
                  <div className="mt-1 text-sm font-extrabold text-[#111713] tabular-nums">
                    {formatPrice(p.marketPrice)}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-[#648770]">
                    {p.lastTimeLabel || "NA"}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}