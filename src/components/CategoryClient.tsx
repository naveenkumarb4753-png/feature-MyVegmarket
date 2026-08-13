"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { DbProduct, DbCategory } from "@/lib/productsDb";

const CATEGORY_META: Record<DbCategory, { title: string; desc: string }> = {
  vegetables: {
    title: "Vegetables",
    desc: "Browse available items. Open containers to view live offers and shipment options.",
  },
  fruits: {
    title: "Fruits",
    desc: "Premium imports and seasonal fruits for retail and horeca buyers.",
  },
  spices: {
    title: "Spices",
    desc: "Whole and ground spices for restaurants, caterers and bulk kitchens.",
  },
  nuts: {
    title: "Nuts & Dry Fruits",
    desc: "Premium nuts and dry fruits for retail, horeca and catering supply.",
  },
  eggs: {
    title: "Eggs",
    desc: "Fresh egg sourcing with daily supply for UAE businesses.",
  },
  oils: {
    title: "Cooking Oils",
    desc: "Reliable cooking oils for bulk usage for restaurants, hotels and catering.",
  },
};

function safeImg(url?: string | null) {
  return (
    url ||
    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80"
  );
}

export default function CategoryClient({
  category,
  products,
}: {
  category: DbCategory;
  products: DbProduct[];
}) {
  const cat = category;
  const meta = CATEGORY_META[cat];

  const pathname = usePathname();

  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState("All");
  const [sort, setSort] = useState<"low" | "high">("low");

  const baseList = useMemo(() => products, [products]);

  const origins = useMemo(() => {
    const cleaned = baseList
      .map((p) => (p.origin_country || "").trim())
      .filter(Boolean);

    const set = new Set(cleaned.map((x) => x.toLowerCase()));
    const display = Array.from(set).map((x) => x[0].toUpperCase() + x.slice(1));

    return ["All", ...display];
  }, [baseList]);

  // ✅ show origin only when there are multiple real origins
  const showOriginFilter = origins.length > 2;

  const filtered = useMemo(() => {
    let list = [...baseList];

    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((p) => {
        const org = (p.origin_country ?? "").toLowerCase();
        return p.name.toLowerCase().includes(s) || org.includes(s);
      });
    }

    if (showOriginFilter && origin !== "All") {
      const o = origin.trim().toLowerCase();
      list = list.filter(
        (p) => (p.origin_country || "").trim().toLowerCase() === o
      );
    }

    // Sort (A–Z / Z–A)
    list.sort((a, b) => {
      const diff = a.name.localeCompare(b.name);
      return sort === "low" ? diff : -diff;
    });

    return list;
  }, [baseList, search, origin, sort, showOriginFilter]);

  const handleDownloadPdf = async () => {
    const qs = new URLSearchParams({
      category: cat,
      search,
      origin,
      sort,
    });

    const url = `/api/category-report?${qs.toString()}`;
    const filename = `myvegmarket-${cat}-catalog.pdf`;

    try {
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
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
          <span className="text-[#111713] font-bold">{meta.title}</span>
        </div>

        {/* Heading */}
        <div className="flex flex-wrap justify-between items-end gap-6 mb-8">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-black tracking-tight text-[#111713] leading-[1.05]">
              {meta.title}
            </h1>
            <p className="text-[#648770] text-lg font-medium mt-3 max-w-xl">{meta.desc}</p>
          </div>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 rounded-full h-12 px-6 bg-white border border-[#e0e8e3] text-[#111713] font-bold shadow-sm hover:shadow-md transition-all"
          >
            <span className="material-symbols-outlined">download</span>
            <span>Catalog (PDF)</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white text-[#111713] rounded-2xl p-4 mb-10 shadow-sm border border-[#e0e8e3]">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-start">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
              {/* Search */}
              <div className="relative w-full min-w-0">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#648770]">
                  search
                </span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${meta.title.toLowerCase()}...`}
                  className="h-11 w-full min-w-0 rounded-full bg-[#f0f4f2] pl-12 pr-4 text-sm font-semibold text-[#111713] placeholder:text-[#648770] outline-none focus:ring-2 focus:ring-[#0B5D1E]/20"
                />
              </div>

              {/* Origin (only when useful) */}
              {showOriginFilter && (
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="h-11 w-full min-w-0 rounded-full bg-[#f0f4f2] px-4 text-sm font-semibold text-[#111713] outline-none focus:ring-2 focus:ring-[#0B5D1E]/20"
                >
                  {origins.map((o) => (
                    <option key={o} value={o}>
                      Origin: {o}
                    </option>
                  ))}
                </select>
              )}

              {/* Sort */}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                className="h-11 w-full min-w-0 rounded-full bg-[#f0f4f2] px-4 text-sm font-semibold text-[#111713] outline-none focus:ring-2 focus:ring-[#0B5D1E]/20"
              >
                <option value="low">Sort: A to Z</option>
                <option value="high">Sort: Z to A</option>
              </select>
            </div>

            <div className="text-sm font-medium text-[#648770] lg:text-right">
              Showing {filtered.length} results
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="group bg-white rounded-2xl overflow-hidden border border-[#e0e8e3] shadow-sm hover:shadow-xl transition-all flex flex-col"
            >
              {/* Whole card clickable (goes to containers) */}
              <Link
                href={`/product/${p.slug}/containers?back=${encodeURIComponent(pathname || "/")}`}
                className="block flex-1"
                aria-label={`Open ${p.name}`}
              >
                <div className="relative h-[260px] sm:h-[280px] overflow-hidden bg-white flex items-center justify-center">
                  <img
                    src={safeImg((p as any).image_public_url)}
                    alt={p.name}
                    className="w-full h-full object-contain p-6 group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80";
                    }}
                  />

                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-[#111713] flex items-center gap-2 shadow-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1db954]" />
                    {p.origin_country || "Origin"}
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-extrabold leading-tight text-[#111713]">
                    {p.name}
                  </h3>
                </div>
              </Link>

              {/* Keep button */}
              <div className="px-5 pb-5">
                <Link
                  href={`/product/${p.slug}/containers?back=${encodeURIComponent(pathname || "/")}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-[#1db954] text-white font-extrabold text-sm h-11 rounded-full hover:opacity-95 transition-opacity flex items-center justify-center"
                >
                  View Containers
                </Link>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="mt-10 text-[#648770] font-medium">
            No products available in this category yet.
          </div>
        )}
      </div>
    </main>
  );
}