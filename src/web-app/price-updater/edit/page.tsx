"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";

const PRODUCTS_TABLE = "products";
const UPDATES_TABLE = "price_updates";

type DbProduct = {
  id: string;
  slug: string | null;
  name: string;
  category: string;
  unit: string | null;
  packaging: string | null;
  origin_country: string | null;
  market_price_aed: number | null;
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

function safeKey(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
}

export default function MobileEditPage() {
  return (
    <Suspense fallback={<div className="p-6 font-bold">Loading…</div>}>
      <MobileEditInner />
    </Suspense>
  );
}

function MobileEditInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const mode = (sp.get("mode") === "new" ? "new" : "existing") as "existing" | "new";
  const productId = sp.get("id") || "";
  const productKey = sp.get("key") || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [draft, setDraft] = useState<UpdateDraft | null>(null);
  const [submittedToday, setSubmittedToday] = useState<number>(0);

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      setToast(null);

      if (mode === "new") {
        if (!mounted) return;
        setDraft({
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
        setLoading(false);
        return;
      }

      const supabase = safeSupabase();
      if (!supabase) {
        if (!mounted) return;
        setToast("Supabase not ready.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from(PRODUCTS_TABLE)
        .select("id,slug,name,category,unit,packaging,origin_country,market_price_aed")
        .eq("id", productId)
        .maybeSingle<DbProduct>();

      if (!mounted) return;

      if (error || !data) {
        setToast(error?.message || "Product not found.");
        setLoading(false);
        return;
      }

      setDraft({
        mode: "existing",
        product_id: data.id,
        product_key: data.slug?.trim() ? data.slug.trim() : productKey || safeKey(`${data.category}-${data.name}`),
        category: data.category,
        name: data.name,
        origin_country: data.origin_country || "",
        packaging: data.packaging || "",
        unit: data.unit || "",
        variety: "",
        price: data.market_price_aed != null ? String(data.market_price_aed) : "",
        currency: "AED",
        price_date: todayISO(),
        price_time: nowTimeISO(),
      });

      setLoading(false);
    }

    init();
    return () => {
      mounted = false;
    };
  }, [mode, productId, productKey]);

  useEffect(() => {
    let mounted = true;

    async function loadTodayCount() {
      const supabase = safeSupabase();
      if (!supabase) return;

      const secret =
        typeof window !== "undefined" ? localStorage.getItem("updater_secret") || "" : "";

      if (!secret) return;

      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from(UPDATES_TABLE)
        .select("id", { count: "exact", head: true })
        .gte("created_at", start.toISOString());

      if (!mounted) return;
      setSubmittedToday(count || 0);
    }

    loadTodayCount();
    return () => {
      mounted = false;
    };
  }, []);

  const pageTitle = useMemo(() => {
    if (!draft) return "Update";
    return draft.mode === "new" ? "Add New Product" : draft.name || "Update Price";
  }, [draft]);

  async function submit() {
    if (!draft) return;

    const priceNum = Number(draft.price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setToast("Enter a valid price.");
      return;
    }

    if (!draft.price_date.trim()) {
      setToast("Please choose the price date.");
      return;
    }

    if (!draft.price_time.trim()) {
      setToast("Please choose the price time.");
      return;
    }

    let finalProductKey = draft.product_key;

    if (draft.mode === "new") {
      if (!draft.name.trim()) return setToast("Product name is required.");
      if (!draft.category.trim()) return setToast("Category is required.");
      if (!draft.origin_country.trim()) return setToast("Origin country is required.");
      if (!draft.packaging.trim()) return setToast("Packaging is required.");
      if (!draft.unit.trim()) return setToast("Unit is required.");

      finalProductKey = safeKey(
        `${draft.category}-${draft.name}-${draft.origin_country}-${draft.packaging}`
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
        mode: draft.mode,
        product_id: draft.product_id || null,
        product_key: finalProductKey,
        category: draft.category.trim(),
        name: draft.name.trim(),
        origin_country: draft.origin_country.trim(),
        packaging: draft.packaging.trim(),
        unit: draft.unit.trim(),
        variety: draft.variety.trim() || "",
        price: priceNum,
        currency: draft.currency || "AED",
        price_date: draft.price_date,
        price_time: draft.price_time,
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

      router.push("/price-updater?submitted=1");
    } catch (e: unknown) {
      setToast(e instanceof Error ? e.message : "Something went wrong.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f8f7] px-4 py-6">
        <div className="mx-auto max-w-[720px] text-[#111713] font-bold">Loading…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8f7] px-4 py-4">
      <div className="mx-auto max-w-[720px]">
        <div className="sticky top-0 z-20 mb-4 rounded-[24px] border border-[#e0e8e3] bg-white/90 backdrop-blur px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center justify-center rounded-full h-11 px-4 bg-[#eef2f0] text-[#111713] font-black"
            >
              Back
            </button>

            <div className="min-w-0 text-center">
              <div className="text-base font-black text-[#111713] truncate">{pageTitle}</div>
              <div className="text-xs font-semibold text-[#648770]">
                Updates today: {submittedToday}
              </div>
            </div>

            <div className="w-[72px]" />
          </div>
        </div>

        {toast && (
          <div className="mb-4 rounded-[20px] border border-[#e0e8e3] bg-white px-4 py-3 text-[#111713] font-semibold shadow-sm">
            {toast}
          </div>
        )}

        {draft && (
          <div className="rounded-[28px] border border-[#e0e8e3] bg-white p-5 shadow-[0_18px_50px_rgba(17,23,19,0.06)]">
            <div className="rounded-[20px] border border-[#e0e8e3] bg-[#f6f8f7] p-4">
              <div className="text-xs font-black text-[#8aa59a] uppercase tracking-wide">
                {draft.mode === "existing" ? "Existing product" : "New product"}
              </div>
              <div className="mt-1 text-xl font-black text-[#111713]">
                {draft.name || "New product"}
              </div>
              <div className="text-sm font-semibold text-[#648770]">
                {draft.category || "Fill details below"}
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {draft.mode === "new" && (
                <>
                  <Field label="Product name">
                    <input
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      className="w-full h-12 px-4 rounded-[18px] border border-[#e0e8e3] bg-[#f6f8f7] font-semibold outline-none focus:ring-2 focus:ring-[#1db954]/30"
                      placeholder="e.g. Tomato"
                    />
                  </Field>

                  <Field label="Category">
                    <input
                      value={draft.category}
                      onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                      className="w-full h-12 px-4 rounded-[18px] border border-[#e0e8e3] bg-[#f6f8f7] font-semibold outline-none focus:ring-2 focus:ring-[#1db954]/30"
                      placeholder="e.g. vegetables"
                    />
                  </Field>

                  <Field label="Origin country">
                    <input
                      value={draft.origin_country}
                      onChange={(e) => setDraft({ ...draft, origin_country: e.target.value })}
                      className="w-full h-12 px-4 rounded-[18px] border border-[#e0e8e3] bg-[#f6f8f7] font-semibold outline-none focus:ring-2 focus:ring-[#1db954]/30"
                      placeholder="e.g. India"
                    />
                  </Field>

                  <Field label="Packaging">
                    <input
                      value={draft.packaging}
                      onChange={(e) => setDraft({ ...draft, packaging: e.target.value })}
                      className="w-full h-12 px-4 rounded-[18px] border border-[#e0e8e3] bg-[#f6f8f7] font-semibold outline-none focus:ring-2 focus:ring-[#1db954]/30"
                      placeholder="e.g. 3.1kg Mesh bag / Carton"
                    />
                  </Field>

                  <Field label="Unit">
                    <input
                      value={draft.unit}
                      onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                      className="w-full h-12 px-4 rounded-[18px] border border-[#e0e8e3] bg-[#f6f8f7] font-semibold outline-none focus:ring-2 focus:ring-[#1db954]/30"
                      placeholder="e.g. kg / box / carton"
                    />
                  </Field>

                  <Field label="Variety (optional)">
                    <input
                      value={draft.variety}
                      onChange={(e) => setDraft({ ...draft, variety: e.target.value })}
                      className="w-full h-12 px-4 rounded-[18px] border border-[#e0e8e3] bg-[#f6f8f7] font-semibold outline-none focus:ring-2 focus:ring-[#1db954]/30"
                      placeholder="e.g. G4 / Grade A"
                    />
                  </Field>
                </>
              )}

              {draft.mode === "existing" && (
                <>
                  <LockedField label="Origin country" value={draft.origin_country || "—"} />
                  <LockedField label="Packaging" value={draft.packaging || "—"} />
                  <LockedField label="Unit" value={draft.unit || "—"} />
                  <LockedField label="Variety" value={draft.variety || "—"} />
                </>
              )}

              <Field label="Market Price (AED)">
                <input
                  value={draft.price}
                  onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                  className="w-full h-12 px-4 rounded-[18px] border border-[#e0e8e3] bg-[#f6f8f7] font-semibold outline-none focus:ring-2 focus:ring-[#1db954]/30"
                  placeholder="e.g. 12.50"
                />
              </Field>

              <div className="grid grid-cols-1 gap-4">
                <Field label="Price Date">
                  <input
                    type="date"
                    value={draft.price_date}
                    onChange={(e) => setDraft({ ...draft, price_date: e.target.value })}
                    className="w-full h-12 px-4 rounded-[18px] border border-[#e0e8e3] bg-[#f6f8f7] font-semibold outline-none focus:ring-2 focus:ring-[#1db954]/30"
                  />
                </Field>

                <Field label="Price Time">
                  <input
                    type="time"
                    value={draft.price_time}
                    onChange={(e) => setDraft({ ...draft, price_time: e.target.value })}
                    className="w-full h-12 px-4 rounded-[18px] border border-[#e0e8e3] bg-[#f6f8f7] font-semibold outline-none focus:ring-2 focus:ring-[#1db954]/30"
                  />
                </Field>
              </div>

              <div className="sticky bottom-3 mt-6">
                <div className="rounded-[24px] border border-[#d9efe1] bg-white/95 backdrop-blur p-3 shadow-[0_18px_50px_rgba(17,23,19,0.10)]">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => router.back()}
                      className="h-12 rounded-full bg-[#eef2f0] text-[#111713] font-black"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submit}
                      disabled={saving}
                      className="h-12 rounded-full bg-[#1db954] text-white font-black shadow-[0_12px_28px_rgba(29,185,84,0.25)] disabled:opacity-60"
                    >
                      {saving ? "Submitting…" : "Submit"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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