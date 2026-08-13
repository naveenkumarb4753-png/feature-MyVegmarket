"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";

const PRODUCTS_TABLE = "products";
const UPDATES_TABLE = "price_updates";
const UPDATERS_TABLE = "updaters";

type DbProduct = {
  id: string;
  slug: string | null;
  name: string;
  category: string;
  unit: string | null;
  image_url: string | null;
  active: boolean;
  sort_order: number | null;
  market_price_aed: number | null;
  myveg_price_aed: number | null;
  price_note: string | null;
  created_at: string | null;
  updated_at: string | null;
  packaging: string | null;
  origin_country: string | null;
};

type UpdaterRow = {
  id: string;
  name: string;
  is_active: boolean;
  secret_hash?: string | null;
  secret?: string | null;
};

type UpdateDraft = {
  mode: "existing" | "new";
  product_id?: string;
  product_key: string;
  category: string;
  name: string;
  origin_country: string;
  packaging: string;
  unit: string;
  variety: string;
  price: string;
  currency: string;
  price_date: string;
  price_time: string;
};

function safeSupabase() {
  try {
    return getSupabase();
  } catch {
    return null;
  }
}

function safeKey(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nowTimeISO() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

function todayStartISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function sha256Hex(input: string) {
  const enc = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 1024;
}

export default function PriceUpdaterPage() {
  return (
    <Suspense fallback={<div className="p-6 font-bold">Loading…</div>}>
      <PriceUpdaterInner />
    </Suspense>
  );
}

function PriceUpdaterInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [accessErr, setAccessErr] = useState<string | null>(null);
  const [updater, setUpdater] = useState<{ id: string; name: string } | null>(null);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [selected, setSelected] = useState<UpdateDraft | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [todayStats, setTodayStats] = useState<{
    totalToday: number;
    mineToday: number;
    lastSubmitAt: string | null;
  }>({ totalToday: 0, mineToday: 0, lastSubmitAt: null });

  useEffect(() => {
    let mounted = true;

    async function initAccess() {
      setLoading(true);
      setAccessErr(null);
      setToast(null);

      const supabase = safeSupabase();
      if (!supabase) {
        setAccessErr(
          "Supabase not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart."
        );
        setLoading(false);
        return;
      }

      const urlSecret = (sp.get("secret") || "").trim();
      const stored =
        typeof window !== "undefined" ? localStorage.getItem("updater_secret") || "" : "";
      const secret = urlSecret || stored;

      if (!secret) {
        setAccessErr("Updater access required. Open the link with ?secret=XXXX");
        setLoading(false);
        return;
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("updater_secret", secret);
      }

      const secretHash = await sha256Hex(secret);
      let upd: UpdaterRow | null = null;

      const byHash = await supabase
        .from(UPDATERS_TABLE)
        .select("id,name,is_active,secret_hash")
        .eq("secret_hash", secretHash)
        .eq("is_active", true)
        .maybeSingle<UpdaterRow>();

      if (!byHash.error && byHash.data) upd = byHash.data;

      if (!upd) {
        const byPlain = await supabase
          .from(UPDATERS_TABLE)
          .select("id,name,is_active,secret")
          .eq("secret", secret)
          .eq("is_active", true)
          .maybeSingle<UpdaterRow>();

        if (!byPlain.error && byPlain.data) upd = byPlain.data;
      }

      if (!upd) {
        setAccessErr("Invalid / inactive secret key. Ask admin for correct link.");
        setLoading(false);
        return;
      }

      if (!mounted) return;
      setUpdater({ id: upd.id, name: upd.name });
      setLoading(false);
    }

    initAccess();
    return () => {
      mounted = false;
    };
  }, [sp]);

  useEffect(() => {
    let mounted = true;

    async function loadProducts() {
      if (!updater) return;

      const supabase = safeSupabase();
      if (!supabase) return;

      const { data, error } = await supabase
        .from(PRODUCTS_TABLE)
        .select(
          "id,slug,name,category,unit,image_url,active,sort_order,market_price_aed,myveg_price_aed,price_note,created_at,updated_at,packaging,origin_country"
        )
        .eq("active", true)
        .order("category", { ascending: true })
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (!mounted) return;

      if (error) {
        setToast(error.message);
        setProducts([]);
        return;
      }

      setProducts((data as DbProduct[]) || []);
    }

    loadProducts();
    return () => {
      mounted = false;
    };
  }, [updater]);

  useEffect(() => {
    let mounted = true;

    async function loadTodayStats() {
      if (!updater) return;
      const supabase = safeSupabase();
      if (!supabase) return;

      const start = todayStartISO();

      const totalRes = await supabase
        .from(UPDATES_TABLE)
        .select("id", { count: "exact", head: true })
        .gte("created_at", start);

      const mineRes = await supabase
        .from(UPDATES_TABLE)
        .select("id", { count: "exact", head: true })
        .eq("submitted_by", updater.id)
        .gte("created_at", start);

      const lastRes = await supabase
        .from(UPDATES_TABLE)
        .select("created_at")
        .eq("submitted_by", updater.id)
        .gte("created_at", start)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!mounted) return;

      setTodayStats({
        totalToday: totalRes.count || 0,
        mineToday: mineRes.count || 0,
        lastSubmitAt: (lastRes.data as { created_at: string }[] | null)?.[0]?.created_at || null,
      });
    }

    loadTodayStats();
    return () => {
      mounted = false;
    };
  }, [updater]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.category));
    return ["all", ...Array.from(set)];
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const okCat = cat === "all" ? true : p.category === cat;
      const okQ = !q
        ? true
        : p.name.toLowerCase().includes(q) || (p.slug || "").toLowerCase().includes(q);
      return okCat && okQ;
    });
  }, [products, query, cat]);

  function pickExisting(p: DbProduct) {
    setToast(null);

    const product_key = p.slug?.trim()
      ? p.slug.trim()
      : safeKey(`${p.category}-${p.name}`);

    if (isMobileViewport()) {
      router.push(
        `/price-updater/edit?mode=existing&id=${encodeURIComponent(
          p.id
        )}&key=${encodeURIComponent(product_key)}`
      );
      return;
    }

    setSelected({
      mode: "existing",
      product_id: p.id,
      product_key,
      category: p.category,
      name: p.name,
      origin_country: p.origin_country || "",
      packaging: p.packaging || "",
      unit: p.unit || "",
      variety: "",
      price: p.market_price_aed != null ? String(p.market_price_aed) : "",
      currency: "AED",
      price_date: todayISO(),
      price_time: nowTimeISO(),
    });
  }

  function startNew() {
    setToast(null);

    if (isMobileViewport()) {
      router.push(`/price-updater/edit?mode=new`);
      return;
    }

    setSelected({
      mode: "new",
      product_key: "",
      category: "",
      name: "",
      origin_country: "",
      packaging: "",
      unit: "",
      variety: "",
      price: "",
      currency: "AED",
      price_date: todayISO(),
      price_time: nowTimeISO(),
    });
  }

  async function submit() {
    if (!selected) return;

    const priceNum = Number(selected.price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setToast("Enter a valid price.");
      return;
    }

    if (!selected.price_date.trim()) {
      setToast("Please choose the price date.");
      return;
    }

    if (!selected.price_time.trim()) {
      setToast("Please choose the price time.");
      return;
    }

    let product_key = selected.product_key;

    if (selected.mode === "new") {
      if (!selected.name.trim()) return setToast("Product name is required.");
      if (!selected.category.trim()) return setToast("Category is required.");
      if (!selected.origin_country.trim()) return setToast("Origin country is required.");
      if (!selected.packaging.trim()) return setToast("Packaging is required.");
      if (!selected.unit.trim()) return setToast("Unit is required.");

      product_key = safeKey(
        `${selected.category}-${selected.name}-${selected.origin_country}-${selected.packaging}`
      );
    }

    setSaving(true);
    setToast(null);

    try {
      const secret =
        typeof window !== "undefined" ? localStorage.getItem("updater_secret") || "" : "";

      if (!secret) {
        setToast("Missing updater secret. Please login again.");
        setSaving(false);
        return;
      }

      const payload = {
        mode: selected.mode,
        product_id: selected.product_id || null,
        product_key,
        category: selected.category.trim(),
        name: selected.name.trim(),
        origin_country: selected.origin_country.trim(),
        packaging: selected.packaging.trim(),
        unit: selected.unit.trim(),
        variety: selected.variety.trim() || "",
        price: priceNum,
        currency: selected.currency || "AED",
        price_date: selected.price_date,
        price_time: selected.price_time,
      };

      const res = await fetch("/api/price-updates/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, payload }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Submit failed");
      }

      setToast("✅ Submitted for admin approval.");
      setSelected(null);

      const supabase = safeSupabase();
      if (supabase && updater) {
        const start = todayStartISO();

        const mineRes = await supabase
          .from(UPDATES_TABLE)
          .select("id", { count: "exact", head: true })
          .eq("submitted_by", updater.id)
          .gte("created_at", start);

        const totalRes = await supabase
          .from(UPDATES_TABLE)
          .select("id", { count: "exact", head: true })
          .gte("created_at", start);

        setTodayStats((s) => ({
          ...s,
          mineToday: mineRes.count || s.mineToday,
          totalToday: totalRes.count || s.totalToday,
          lastSubmitAt: new Date().toISOString(),
        }));
      }
    } catch (e: unknown) {
      setToast(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function clearSecret() {
    if (typeof window !== "undefined") localStorage.removeItem("updater_secret");
    router.push("/updater-login");
  }

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-[#f6f8f7] px-4 sm:px-6 lg:px-12 py-10">
        <div className="max-w-[1100px] mx-auto text-[#111713] font-bold">Loading…</div>
      </main>
    );
  }

  if (accessErr || !updater) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-[#f6f8f7] px-4 sm:px-6 lg:px-12 py-10">
        <div className="max-w-[960px] mx-auto bg-white border border-[#e0e8e3] rounded-[28px] p-8 shadow-sm">
          <div className="text-2xl font-black text-[#111713]">Updater access required</div>
          <p className="mt-2 text-[#648770] font-semibold">
            {accessErr || "Open using a valid secret link."}
          </p>
          <Link
            href="/updater-login"
            className="mt-6 inline-flex items-center justify-center rounded-full h-12 px-6 bg-[#1db954] text-white font-black shadow-[0_10px_25px_rgba(29,185,84,0.25)] hover:brightness-110 transition"
          >
            Go to Updater Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#f6f8f7] px-4 sm:px-6 lg:px-12 py-10">
      <div className="max-w-[1440px] mx-auto">
        <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-[#111713]">Price Updater</h1>
            <p className="mt-1 text-[#648770] font-semibold">Updater: {updater.name}</p>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <Pill label="My updates today" value={String(todayStats.mineToday)} />
              <Pill label="Total updates today" value={String(todayStats.totalToday)} />
              <Pill label="Date" value={todayISO()} />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/admin/price-approvals"
                className="inline-flex items-center justify-center rounded-full h-11 px-5 bg-[#eef2f0] text-[#111713] font-black hover:bg-[#e7ecea] transition"
              >
                Admin (if allowed)
              </Link>
              <button
                onClick={clearSecret}
                className="inline-flex items-center justify-center rounded-full h-11 px-5 bg-white border border-[#e0e8e3] text-[#111713] font-black hover:bg-[#f6f8f7] transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#e0e8e3] rounded-[28px] p-5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="text-xs font-black text-[#8aa59a] uppercase tracking-wide">
                Search product
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type product name…"
                className="mt-2 w-full h-12 px-4 rounded-[18px] border border-[#e0e8e3] bg-[#f6f8f7] text-[#111713] font-semibold outline-none focus:ring-2 focus:ring-[#1db954]/30"
              />
            </div>

            <div>
              <div className="text-xs font-black text-[#8aa59a] uppercase tracking-wide">
                Category
              </div>
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="mt-2 w-full h-12 px-4 rounded-[18px] border border-[#e0e8e3] bg-[#f6f8f7] text-[#111713] font-semibold outline-none focus:ring-2 focus:ring-[#1db954]/30"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={startNew}
                className="w-full h-12 rounded-full bg-[#1db954] text-white font-black shadow-[0_12px_28px_rgba(29,185,84,0.25)] hover:brightness-110 transition"
              >
                + Add New Product
              </button>
            </div>
          </div>
        </div>

        {toast && (
          <div className="mt-5 bg-white border border-[#e0e8e3] rounded-[18px] px-5 py-4 text-[#111713] font-semibold shadow-sm">
            {toast}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-[#e0e8e3] rounded-[28px] overflow-hidden shadow-sm">
            <div className="p-5 border-b border-[#e0e8e3] flex items-center justify-between">
              <div className="text-xl font-black text-[#111713]">Products ({filtered.length})</div>
              <div className="text-sm font-semibold text-[#648770] hidden sm:block">
                Select to update price
              </div>
            </div>

            <div className="max-h-[640px] overflow-auto">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => pickExisting(p)}
                  className="w-full text-left px-5 py-4 border-b border-[#eef2f0] hover:bg-[#f6f8f7] active:scale-[0.998] transition"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[#111713] font-black text-lg truncate">{p.name}</div>
                      <div className="text-[#648770] font-semibold text-sm">
                        {p.category}
                        {" • "}Origin: {p.origin_country || "—"}
                        {" • "}Packaging: {p.packaging || "—"}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-[#8aa59a] uppercase">Market</div>
                      <div className="text-[#111713] font-black">
                        {p.market_price_aed == null
                          ? "—"
                          : `AED ${Number(p.market_price_aed).toFixed(2)}`}
                      </div>
                    </div>
                  </div>
                </button>
              ))}

              {filtered.length === 0 && (
                <div className="p-6 text-[#648770] font-semibold">No products found.</div>
              )}
            </div>
          </div>

          <div className="hidden lg:block bg-white border border-[#e0e8e3] rounded-[28px] p-6 shadow-sm">
            <div className="text-xl font-black text-[#111713]">Update Form</div>
            <p className="mt-1 text-[#648770] font-semibold text-sm">
              Existing products: origin + packaging are locked. Only price can change.
            </p>

            {!selected ? (
              <div className="mt-6 rounded-[18px] border border-[#e0e8e3] bg-[#f6f8f7] p-4 text-[#648770] font-semibold">
                Select a product or click “Add New Product”.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="rounded-[18px] border border-[#e0e8e3] bg-[#f6f8f7] p-4">
                  <div className="text-xs font-black text-[#8aa59a] uppercase tracking-wide">
                    {selected.mode === "existing" ? "Existing product" : "New product"}
                  </div>
                  <div className="mt-1 text-lg font-black text-[#111713]">
                    {selected.name || "—"}
                  </div>
                  <div className="text-sm font-semibold text-[#648770]">
                    {selected.category || "—"}
                  </div>
                </div>

                {selected.mode === "new" && (
                  <>
                    <Field label="Product name">
                      <input
                        value={selected.name}
                        onChange={(e) => setSelected({ ...selected, name: e.target.value })}
                        className="w-full h-12 px-4 rounded-[18px] border border-[#e0e8e3] bg-[#f6f8f7] font-semibold outline-none focus:ring-2 focus:ring-[#1db954]/30"
                        placeholder="e.g. Tomato"
                      />
                    </Field>

                    <Field label="Category">
                      <input
                        value={selected.category}
                        onChange={(e) => setSelected({ ...selected, category: e.target.value })}
                        className="w-full h-12 px-4 rounded-[18px] border border-[#e0e8e3] bg-[#f6f8f7] font-semibold outline-none focus:ring-2 focus:ring-[#1db954]/30"
                        placeholder="e.g. vegetables"
                      />
                    </Field>

                    <Field label="Origin country">
                      <input
                        value={selected.origin_country}
                        onChange={(e) =>
                          setSelected({ ...selected, origin_country: e.target.value })
                        }
                        className="w-full h-12 px-4 rounded-[18px] border border-[#e0e8e3] bg-[#f6f8f7] font-semibold outline-none focus:ring-2 focus:ring-[#1db954]/30"
                        placeholder="e.g. India"
                      />
                    </Field>

                    <Field label="Packaging">
                      <input
                        value={selected.packaging}
                        onChange={(e) => setSelected({ ...selected, packaging: e.target.value })}
                        className="w-full h-12 px-4 rounded-[18px] border border-[#e0e8e3] bg-[#f6f8f7] font-semibold outline-none focus:ring-2 focus:ring-[#1db954]/30"
                        placeholder="e.g. 3.1kg Mesh bag / Carton"
                      />
                    </Field>

                    <Field label="Unit">
                      <input
                        value={selected.unit}
                        onChange={(e) => setSelected({ ...selected, unit: e.target.value })}
                        className="w-full h-12 px-4 rounded-[18px] border border-[#e0e8e3] bg-[#f6f8f7] font-semibold outline-none focus:ring-2 focus:ring-[#1db954]/30"
                        placeholder="e.g. kg / box / carton"
                      />
                    </Field>

                    <Field label="Variety (optional)">
                      <input
                        value={selected.variety}
                        onChange={(e) => setSelected({ ...selected, variety: e.target.value })}
                        className="w-full h-12 px-4 rounded-[18px] border border-[#e0e8e3] bg-[#f6f8f7] font-semibold outline-none focus:ring-2 focus:ring-[#1db954]/30"
                        placeholder="e.g. G4 / Grade A"
                      />
                    </Field>
                  </>
                )}

                {selected.mode === "existing" && (
                  <>
                    <LockedField label="Origin country" value={selected.origin_country || "—"} />
                    <LockedField label="Packaging" value={selected.packaging || "—"} />
                    <LockedField label="Unit" value={selected.unit || "—"} />
                    <LockedField label="Variety" value={selected.variety || "—"} />
                  </>
                )}

                <Field label="Market Price (AED)">
                  <input
                    value={selected.price}
                    onChange={(e) => setSelected({ ...selected, price: e.target.value })}
                    className="w-full h-12 px-4 rounded-[18px] border border-[#e0e8e3] bg-[#f6f8f7] font-semibold outline-none focus:ring-2 focus:ring-[#1db954]/30"
                    placeholder="e.g. 12.50"
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Price Date">
                    <input
                      type="date"
                      value={selected.price_date}
                      onChange={(e) => setSelected({ ...selected, price_date: e.target.value })}
                      className="w-full h-12 px-4 rounded-[18px] border border-[#e0e8e3] bg-[#f6f8f7] font-semibold outline-none focus:ring-2 focus:ring-[#1db954]/30"
                    />
                  </Field>

                  <Field label="Price Time">
                    <input
                      type="time"
                      value={selected.price_time}
                      onChange={(e) => setSelected({ ...selected, price_time: e.target.value })}
                      className="w-full h-12 px-4 rounded-[18px] border border-[#e0e8e3] bg-[#f6f8f7] font-semibold outline-none focus:ring-2 focus:ring-[#1db954]/30"
                    />
                  </Field>
                </div>

                <button
                  onClick={submit}
                  disabled={saving}
                  className="w-full h-12 rounded-full bg-[#1db954] text-white font-black shadow-[0_12px_28px_rgba(29,185,84,0.25)] hover:brightness-110 transition disabled:opacity-60"
                >
                  {saving ? "Submitting…" : "Submit for Approval"}
                </button>

                <button
                  onClick={() => setSelected(null)}
                  className="w-full h-12 rounded-full bg-[#eef2f0] text-[#111713] font-black hover:bg-[#e7ecea] transition"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-black text-[#111713] mb-2">{label}</label>
      {children}
    </div>
  );
}

function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[#e0e8e3] bg-white px-4 py-3">
      <div className="text-xs font-black text-[#8aa59a] uppercase tracking-wide">{label}</div>
      <div className="mt-1 text-[#111713] font-black">{value}</div>
      <div className="text-xs text-[#648770] font-semibold mt-1">Locked</div>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-[#e0e8e3] bg-white px-4 py-2 shadow-sm">
      <div className="text-[10px] font-black text-[#8aa59a] uppercase leading-none">{label}</div>
      <div className="mt-1 text-sm font-black text-[#111713] leading-none">{value}</div>
    </div>
  );
}