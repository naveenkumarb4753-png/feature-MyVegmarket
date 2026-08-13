"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabaseClient";
import { requireRole } from "@/lib/roles";

const UPDATES_TABLE = "price_updates";
const PRODUCTS_TABLE = "products";

type Status = "pending" | "approved" | "rejected";

type UpdateRow = {
  id: string;

  submitted_by: string;
  submitted_by_email: string | null;

  product_key: string | null;
  is_new_product: boolean;

  category: string;
  name: string;
  variety: string | null;
  country: string;
  price: number;
  currency: string;

  image_url: string | null;
  status: Status;

  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;

  created_at: string;

  updater_id: string | null;
  updater_name: string | null;
  updater_secret_hash: string | null;

  published_product_id: string | null;
  published_at: string | null;

  packaging: string | null;
  origin_country: string | null;
  unit: string | null;
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  unit: string;
  image_url: string | null;
  active: boolean;
  sort_order: number;
  market_price_aed: number | null;
  myveg_price_aed: number | null;
  price_note: string | null;
  created_at: string;
  updated_at: string;
  packaging: string | null;
  origin_country: string | null;
};

function safeSupabase(): SupabaseClient | null {
  try {
    return getSupabase();
  } catch {
    return null;
  }
}

function todayStartISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function fmtDT(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function safeKey(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
}

function toProductCategory(raw: string) {
  const v = (raw || "").trim().toLowerCase();

  if (v === "fruit" || v === "fruits") return "fruits";
  if (v === "vegetable" || v === "vegetables") return "vegetables";
  if (v === "spice" || v === "spices") return "spices";
  if (v === "nut" || v === "nuts") return "nuts";
  if (v === "egg" || v === "eggs") return "eggs";
  if (v === "oil" || v === "oils") return "oils";

  return v;
}

function fmtMoney(currency: string | null, price: number) {
  const cur = (currency || "AED").toUpperCase();
  const n = Number(price);
  return `${cur} ${Number.isFinite(n) ? n.toFixed(2) : "-"}`;
}

async function getNextSortOrderForCategory(
  supabase: SupabaseClient,
  category: string
) {
  const { data, error } = await supabase
    .from(PRODUCTS_TABLE)
    .select("sort_order")
    .eq("category", category)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (error) return 9999;
  const max = (data?.[0]?.sort_order ?? 0) as number;
  return Number(max) + 1;
}

export default function AdminPriceApprovalsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [rows, setRows] = useState<UpdateRow[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const [onlyPending, setOnlyPending] = useState(true);
  const [updaterFilter, setUpdaterFilter] = useState<string>("all");

  const [refreshTick, setRefreshTick] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);

      const r = await requireRole(["admin"]);
      if (!mounted) return;

      if (!r.ok) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      setAllowed(true);
      await refresh();
      setLoading(false);
    }

    init();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!allowed) return;

    const id = setInterval(() => {
      setRefreshTick((t) => t + 1);
    }, 10000);

    return () => clearInterval(id);
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;
    refresh();
  }, [refreshTick, allowed]);

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    setToast(null);

    const supabase = safeSupabase();
    if (!supabase) {
      setRows([]);
      setToast("Supabase client not ready. Refresh the page.");
      setRefreshing(false);
      return;
    }

    const { data, error } = await supabase
      .from(UPDATES_TABLE)
      .select(
        "id,submitted_by,submitted_by_email,product_key,is_new_product,category,name,variety,country,price,currency,image_url,status,reviewed_by,reviewed_at,review_note,created_at,updater_id,updater_name,updater_secret_hash,published_product_id,published_at,packaging,origin_country,unit"
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      setRows([]);
      setToast(error.message);
      setRefreshing(false);
      return;
    }

    setRows((data as UpdateRow[]) ?? []);
    setRefreshing(false);
  }

  async function signOut() {
    const supabase = safeSupabase();
    if (!supabase) {
      router.push("/updater-login");
      return;
    }
    await supabase.auth.signOut();
    router.push("/updater-login");
  }

  async function approveUpdate(updateId: string) {
    setToast(null);

    const supabase = safeSupabase();
    if (!supabase) {
      setToast("Supabase not ready.");
      return;
    }

    const { data: u } = await supabase.auth.getUser();
    const adminUid = u?.user?.id || null;

    const { data: upd, error: updErr } = await supabase
      .from(UPDATES_TABLE)
      .select(
        "id,product_key,is_new_product,category,name,price,currency,country,origin_country,packaging,unit,variety,updater_name,submitted_by,created_at,status"
      )
      .eq("id", updateId)
      .maybeSingle<UpdateRow>();

    if (updErr || !upd) {
      setToast(updErr?.message || "Update not found.");
      return;
    }

    if (upd.status === "approved") {
      setToast("Already approved.");
      return;
    }

    const reviewTime = new Date().toISOString();
    const effectiveTime = upd.created_at;

    if (upd.is_new_product) {
      const slug =
        upd.product_key && upd.product_key.trim()
          ? upd.product_key.trim()
          : safeKey(
              `${upd.category}-${upd.name}-${upd.origin_country || upd.country}-${upd.packaging || ""}`
            );

      const unit = (upd.unit || "").trim();
      if (!unit) {
        setToast("Cannot approve: unit is missing for new product.");
        return;
      }

      const cat = toProductCategory(upd.category);
      const allowedCats = [
        "fruits",
        "vegetables",
        "spices",
        "nuts",
        "eggs",
        "oils",
      ];

      if (!allowedCats.includes(cat)) {
        setToast(
          `Cannot approve: invalid category "${upd.category}". Must be one of ${allowedCats.join(", ")}`
        );
        return;
      }

      const insertProduct = {
        slug,
        name: upd.name.trim(),
        category: cat,
        unit,
        image_url: null,
        active: true,
        sort_order: await getNextSortOrderForCategory(supabase, cat),
        market_price_aed: Number(upd.price),
        myveg_price_aed: null,
        price_note: null,
        packaging: upd.packaging || null,
        origin_country: upd.origin_country || upd.country || null,
        updated_at: effectiveTime,
      };

      const { data: created, error: insErr } = await supabase
        .from(PRODUCTS_TABLE)
        .insert(insertProduct)
        .select("id")
        .maybeSingle<{ id: string }>();

      if (insErr) {
        setToast(`Create product failed: ${insErr.message}`);
        return;
      }

      const { error: upErr } = await supabase
        .from(UPDATES_TABLE)
        .update({
          status: "approved",
          reviewed_by: adminUid,
          reviewed_at: reviewTime,
          published_product_id: created?.id || null,
          published_at: effectiveTime,
        })
        .eq("id", updateId);

      if (upErr) {
        setToast(upErr.message);
        return;
      }

      setToast("✅ Approved + Product created.");
      await refresh();
      return;
    }

    const key = (upd.product_key || "").trim();
    if (!key) {
      setToast("Cannot approve: product_key missing on this update.");
      return;
    }

    const { data: p, error: pErr } = await supabase
      .from(PRODUCTS_TABLE)
      .select("id,market_price_aed,origin_country,packaging,unit")
      .eq("slug", key)
      .maybeSingle<ProductRow>();

    if (pErr) {
      setToast(pErr.message);
      return;
    }

    if (!p) {
      setToast(`No product found with slug = ${key}.`);
      return;
    }

    const productPatch: Partial<ProductRow> & {
      market_price_aed: number;
      updated_at: string;
    } = {
      market_price_aed: Number(upd.price),
      updated_at: effectiveTime,
    };

    if (!p.origin_country && (upd.origin_country || upd.country)) {
      productPatch.origin_country = upd.origin_country || upd.country;
    }
    if (!p.packaging && upd.packaging) {
      productPatch.packaging = upd.packaging;
    }
    if (!p.unit && upd.unit) {
      productPatch.unit = upd.unit;
    }

    const { error: prodUpErr } = await supabase
      .from(PRODUCTS_TABLE)
      .update(productPatch)
      .eq("id", p.id);

    if (prodUpErr) {
      setToast(prodUpErr.message);
      return;
    }

    const { error: updUpErr } = await supabase
      .from(UPDATES_TABLE)
      .update({
        status: "approved",
        reviewed_by: adminUid,
        reviewed_at: reviewTime,
        published_product_id: p.id,
        published_at: effectiveTime,
      })
      .eq("id", updateId);

    if (updUpErr) {
      setToast(updUpErr.message);
      return;
    }

    setToast("✅ Approved + Product price updated.");
    await refresh();
  }

  async function rejectUpdate(updateId: string) {
    setToast(null);

    const supabase = safeSupabase();
    if (!supabase) {
      setToast("Supabase not ready.");
      return;
    }

    const { data: u } = await supabase.auth.getUser();
    const adminUid = u?.user?.id || null;

    const reviewTime = new Date().toISOString();

    const { error } = await supabase
      .from(UPDATES_TABLE)
      .update({
        status: "rejected",
        reviewed_by: adminUid,
        reviewed_at: reviewTime,
      })
      .eq("id", updateId);

    if (error) {
      setToast(error.message);
      return;
    }

    setToast("✅ Rejected.");
    await refresh();
  }

  const tableRows = useMemo(() => {
    return rows.filter((r) => {
      const okStatus = onlyPending ? r.status === "pending" : true;
      const updName = (r.updater_name || "Unknown").trim() || "Unknown";
      const okUpdater = updaterFilter === "all" ? true : updName === updaterFilter;
      return okStatus && okUpdater;
    });
  }, [rows, onlyPending, updaterFilter]);

  const stats = useMemo(() => {
    const startMs = new Date(todayStartISO()).getTime();

    let totalToday = 0;
    let pendingAll = 0;
    let pendingToday = 0;

    const byUpdater: Record<
      string,
      {
        total: number;
        today: number;
        pending: number;
        pendingToday: number;
        lastAt: string | null;
      }
    > = {};

    for (const r of rows) {
      const upd = (r.updater_name || "Unknown").trim() || "Unknown";
      if (!byUpdater[upd]) {
        byUpdater[upd] = {
          total: 0,
          today: 0,
          pending: 0,
          pendingToday: 0,
          lastAt: null,
        };
      }

      byUpdater[upd].total += 1;

      const t = new Date(r.created_at).getTime();
      const isToday = Number.isFinite(t) && t >= startMs;

      if (isToday) {
        totalToday += 1;
        byUpdater[upd].today += 1;
      }

      if (r.status === "pending") {
        pendingAll += 1;
        byUpdater[upd].pending += 1;
        if (isToday) {
          pendingToday += 1;
          byUpdater[upd].pendingToday += 1;
        }
      }

      if (!byUpdater[upd].lastAt) {
        byUpdater[upd].lastAt = r.created_at;
      }
    }

    const updaterList = Object.entries(byUpdater)
      .map(([name, s]) => ({ name, ...s }))
      .sort((a, b) => b.pending - a.pending || b.today - a.today || b.total - a.total);

    return { totalToday, pendingAll, pendingToday, updaterList };
  }, [rows]);

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-[#f6f8f7] px-4 sm:px-6 lg:px-12 py-10">
        <div className="max-w-[1100px] mx-auto text-[#111713] font-bold">
          Loading…
        </div>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-[#f6f8f7] px-4 sm:px-6 lg:px-12 py-10">
        <div className="max-w-[960px] mx-auto bg-white border border-[#e0e8e3] rounded-[28px] p-8 shadow-sm">
          <div className="text-2xl font-black text-[#111713]">
            Admin access required
          </div>
          <p className="mt-2 text-[#648770] font-semibold">
            Please login using admin email.
          </p>
          <Link
            href="/updater-login"
            className="mt-6 inline-flex items-center justify-center rounded-full h-12 px-6 bg-[#1db954] text-white font-black shadow-[0_10px_25px_rgba(29,185,84,0.25)] hover:brightness-110 transition"
          >
            Go to Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#f6f8f7] px-4 sm:px-6 lg:px-12 py-10">
      <div className="max-w-[1440px] mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-[#111713]">
              Admin – Price Approvals
            </h1>
            <p className="mt-1 text-[#648770] font-semibold">
              Track updater activity + approve/reject submissions
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={signOut}
              className="inline-flex items-center justify-center rounded-full h-11 px-5 bg-white border border-[#e0e8e3] text-[#111713] font-black hover:bg-[#f6f8f7] transition"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-5">
          <Pill label="Total updates today" value={String(stats.totalToday)} />
          <Pill label="Pending today" value={String(stats.pendingToday)} />
          <Pill label="Pending (all)" value={String(stats.pendingAll)} />
        </div>

        {toast && (
          <div className="mb-5 bg-white border border-[#e0e8e3] rounded-[18px] px-5 py-4 text-[#111713] font-semibold shadow-sm">
            {toast}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-[#e0e8e3] rounded-[28px] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-xl font-black text-[#111713]">Updaters</div>
              <button
                onClick={() => setUpdaterFilter("all")}
                className="text-sm font-black text-[#1db954] hover:underline"
              >
                Clear
              </button>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-black text-[#8aa59a] uppercase tracking-wide mb-2">
                Show
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOnlyPending(true)}
                  className={`h-10 px-4 rounded-full border font-black transition ${
                    onlyPending
                      ? "bg-[#111713] text-white border-[#111713]"
                      : "bg-white text-[#111713] border-[#e0e8e3] hover:bg-[#f6f8f7]"
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setOnlyPending(false)}
                  className={`h-10 px-4 rounded-full border font-black transition ${
                    !onlyPending
                      ? "bg-[#111713] text-white border-[#111713]"
                      : "bg-white text-[#111713] border-[#e0e8e3] hover:bg-[#f6f8f7]"
                  }`}
                >
                  All
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {stats.updaterList.length === 0 ? (
                <div className="text-[#648770] font-semibold">
                  No updater activity yet.
                </div>
              ) : (
                stats.updaterList.map((u) => (
                  <button
                    key={u.name}
                    onClick={() => setUpdaterFilter(u.name)}
                    className={`w-full text-left rounded-[18px] border px-4 py-3 transition ${
                      updaterFilter === u.name
                        ? "bg-[#f6f8f7] border-[#cfe9d8]"
                        : "bg-white border-[#e0e8e3] hover:bg-[#f6f8f7]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-black text-[#111713]">{u.name}</div>
                      <span className="text-xs font-black text-[#8aa59a]">
                        {u.lastAt ? fmtDT(u.lastAt) : "—"}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <MiniPill label="Pending" value={String(u.pending)} />
                      <MiniPill label="Today" value={String(u.today)} />
                      <MiniPill label="Total" value={String(u.total)} />
                    </div>

                    <div className="mt-2 text-xs font-semibold text-[#648770]">
                      Pending today:{" "}
                      <span className="font-black text-[#111713]">
                        {u.pendingToday}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-3 bg-white border border-[#e0e8e3] rounded-[28px] overflow-hidden shadow-sm">
            <div className="p-5 border-b border-[#e0e8e3] flex items-center justify-between">
              <div className="text-xl font-black text-[#111713]">
                Updates ({tableRows.length})
              </div>
              <div className="text-sm font-semibold text-[#648770]">
                {onlyPending
                  ? "Pending items should be reviewed"
                  : "All history (latest first)"}
              </div>
            </div>

            <div className="overflow-auto">
              <table className="w-full text-left">
                <thead className="bg-[#f6f8f7]">
                  <tr className="text-xs font-black text-[#8aa59a] uppercase tracking-wide">
                    <th className="p-4">Product</th>
                    <th className="p-4">Updater</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Details</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {tableRows.map((r) => (
                    <tr key={r.id} className="border-t border-[#eef2f0] align-top">
                      <td className="p-4">
                        <div className="font-black text-[#111713]">
                          {r.name}
                          {r.is_new_product ? (
                            <span className="ml-2 inline-flex items-center px-2 h-6 rounded-full bg-[#fff7e6] border border-[#ffe3b3] text-[#8a5a00] text-xs font-black">
                              NEW
                            </span>
                          ) : null}
                        </div>
                        <div className="text-sm font-semibold text-[#648770]">
                          {r.category} • {fmtDT(r.created_at)}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-black text-[#111713]">
                          {r.updater_name || "Unknown"}
                        </div>
                        <div className="text-xs font-semibold text-[#648770] break-all">
                          {r.submitted_by}
                        </div>
                      </td>

                      <td className="p-4 font-black text-[#111713]">
                        {fmtMoney(r.currency, Number(r.price))}
                      </td>

                      <td className="p-4">
                        <div className="font-black text-[#111713]">
                          {r.origin_country || r.country || "—"}
                        </div>
                        <div className="text-sm font-semibold text-[#648770]">
                          {r.packaging || "—"}
                          {r.unit ? ` • ${r.unit}` : ""}
                          {r.variety ? ` • ${r.variety}` : ""}
                        </div>
                        {r.product_key ? (
                          <div className="text-xs font-semibold text-[#8aa59a] mt-1">
                            slug: {r.product_key}
                          </div>
                        ) : null}
                        {r.published_product_id ? (
                          <div className="text-xs font-semibold text-[#0f6b33] mt-1">
                            Published: {r.published_product_id}
                          </div>
                        ) : null}
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-3 h-8 rounded-full border font-black text-xs ${
                            r.status === "approved"
                              ? "bg-[#eaf7ef] border-[#cfe9d8] text-[#0f6b33]"
                              : r.status === "rejected"
                              ? "bg-red-50 border-red-200 text-red-700"
                              : "bg-[#fff7e6] border-[#ffe3b3] text-[#8a5a00]"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => approveUpdate(r.id)}
                            disabled={r.status === "approved"}
                            className="h-10 px-4 rounded-full bg-[#1db954] text-white font-black hover:brightness-110 transition disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => rejectUpdate(r.id)}
                            disabled={r.status === "rejected"}
                            className="h-10 px-4 rounded-full bg-[#eef2f0] text-[#111713] font-black hover:bg-[#e7ecea] transition disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {tableRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-[#648770] font-semibold">
                        No updates for this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-5 border-t border-[#e0e8e3] text-sm font-semibold text-[#648770]">
              Tip: click an updater on the left to filter. Keep “Pending” on while
              approving.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-[#e0e8e3] bg-white px-4 py-2 shadow-sm">
      <div className="text-[10px] font-black text-[#8aa59a] uppercase leading-none">
        {label}
      </div>
      <div className="mt-1 text-sm font-black text-[#111713] leading-none">
        {value}
      </div>
    </div>
  );
}

function MiniPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-[#e0e8e3] bg-white px-3 py-1 shadow-sm">
      <span className="text-[10px] font-black text-[#8aa59a] uppercase">
        {label}
      </span>
      <span className="ml-2 text-xs font-black text-[#111713]">{value}</span>
    </div>
  );
}