"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";

type ContainerRow = {
  id: string;
  title: string | null;
  route_from: string | null;
  route_to: string | null;
  container_type: string | null;
  availability_date: string | null;
  qty: number | null;
  price: number | null;

  currency: string | null;
  packaging: string | null;
  quantity_unit: string | null;

  category: string | null;
  market_location: string | null;
  image_path: string | null;

  is_active: boolean | null;
  created_at: string;
};

const BUCKET = "container_images";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function imgPublicUrl(path?: string | null) {
  if (!path) return "";
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

function formatMoney(amount: number | null, currency: string | null) {
  if (amount === null || Number.isNaN(Number(amount))) return "—";
  return `${(currency ?? "AED").toUpperCase()} ${Number(amount).toFixed(0)}`;
}

export default function ViewContainersPage() {
  const [loading, setLoading] = useState(true);
  const [containers, setContainers] = useState<ContainerRow[]>([]);
  const [supabaseReady, setSupabaseReady] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function run() {
      setLoading(true);

      const supabase = getSupabase();
      if (!supabase) {
        if (!mounted) return;
        setSupabaseReady(false);
        setLoading(false);
        return;
      }

      const { data: rows, error } = await supabase
        .from("containers")
        .select(
          "id,title,route_from,route_to,container_type,availability_date,qty,price,currency,packaging,quantity_unit,category,market_location,image_path,is_active,created_at"
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (error) {
        alert(error.message);
        setContainers([]);
      } else {
        setContainers((rows as any) ?? []);
      }

      setLoading(false);
    }

    run();
    return () => {
      mounted = false;
    };
  }, []);

  if (!supabaseReady) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-[#f6f8f7] px-4 sm:px-6 lg:px-12 py-10">
        <div className="max-w-[1100px] mx-auto bg-white border border-[#e0e8e3] rounded-[28px] p-8 shadow-sm">
          <h1 className="text-2xl font-black text-[#111713]">Supabase not configured</h1>
          <p className="mt-2 text-[#648770] font-medium">
            Add <b>NEXT_PUBLIC_SUPABASE_URL</b> and <b>NEXT_PUBLIC_SUPABASE_ANON_KEY</b> in{" "}
            <b>.env.local</b>, then restart.
          </p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-[#f6f8f7] px-4 sm:px-6 lg:px-12 py-10">
        <div className="max-w-[1100px] mx-auto text-[#111713] font-bold">Loading…</div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#f6f8f7] px-4 sm:px-6 lg:px-12 py-10">
      <div className="max-w-[1440px] mx-auto">
        <div className="mb-6">
          <Link
            href="/containers-listing"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#648770] hover:text-[#1db954] transition"
          >
            <span className="text-base">←</span>
            Back to Home
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-[#111713]">Containers Marketplace</h1>
          <p className="mt-2 text-[#648770] font-medium">Published containers</p>
        </div>

        {containers.length === 0 ? (
          <div className="bg-white border border-[#e0e8e3] rounded-[28px] p-8 text-[#648770] font-medium shadow-sm">
            No containers available yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
            {containers.map((c) => {
              const title = c.title ?? "—";
              const route = `${c.route_from ?? "—"} → ${c.route_to ?? "—"}`;
              const type = c.container_type ?? "—";
              const qty = c.qty ?? 0;
              const unit = c.quantity_unit ?? "kg";
              const packaging = (c.packaging ?? "").trim();
              const price = formatMoney(c.price, c.currency);
              const ready = c.availability_date ?? "—";

              const img =
                imgPublicUrl(c.image_path) ||
                "https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=1400&q=80";

              return (
                <article
                  key={c.id}
                  className="bg-white border border-[#e0e8e3] rounded-[28px] overflow-hidden shadow-[0_16px_40px_rgba(17,23,19,0.08)] hover:shadow-[0_20px_55px_rgba(17,23,19,0.12)] transition"
                >
                  <div className="relative h-[220px] bg-[#eef2f0]">
                    <img src={img} alt={title} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                      {c.category && (
                        <div className="inline-flex items-center bg-white/95 backdrop-blur px-3 py-1.5 rounded-full border border-[#e0e8e3] shadow-sm">
                          <span className="text-xs font-black tracking-wide text-[#1db954]">
                            {c.category}
                          </span>
                        </div>
                      )}
                      {c.market_location && (
                        <div className="inline-flex items-center bg-white/95 backdrop-blur px-3 py-1.5 rounded-full border border-[#e0e8e3] shadow-sm">
                          <span className="text-xs font-black tracking-wide text-[#111713]">
                            {c.market_location}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="text-[#111713] font-black text-2xl leading-tight">{title}</div>

                    <div className="mt-2 space-y-1">
                      <div className="text-sm font-semibold text-[#648770]">
                        <span className="font-black text-[#111713]">Packaging Type:</span>{" "}
                        {packaging || "—"}
                      </div>
                      <div className="text-sm font-semibold text-[#648770]">
                        <span className="font-black text-[#111713]">Load Capacity:</span>{" "}
                        {qty} {unit}
                      </div>
                    </div>

                    <div className="mt-2 text-sm text-[#8aa59a] font-semibold">
                      {route} • {type}
                    </div>

                    <div className="mt-5 rounded-[18px] border border-[#e0e8e3] bg-[#f7faf8] px-5 py-4">
                      <div className="flex items-start justify-between gap-6">
                        <div>
                          <div className="text-xs font-black text-[#8aa59a] uppercase tracking-wide">Price</div>
                          <div className="mt-1 text-xl font-black text-[#111713]">{price}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-black text-[#8aa59a] uppercase tracking-wide">Ready Date</div>
                          <div className="mt-1 text-base font-black text-[#111713]">{ready}</div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="mt-5 w-full rounded-full h-12 bg-[#1db954] text-white font-black shadow-[0_10px_25px_rgba(29,185,84,0.25)] hover:brightness-110 transition"
                      onClick={() => alert("Next: connect WhatsApp/Call here ✅")}
                    >
                      Contact MyVegMarket
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
