"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";

type ExporterRow = {
  id: string;
  email: string | null;
  approved: boolean | null;
  status: string | null; // "pending" | "approved" | "rejected"
  company_name: string | null;
  full_name: string | null;
  phone: string | null;
  created_at?: string | null;
};

const EXPORTERS_TABLE = "exporters";
const LISTINGS_TABLE = "container_listings";

const BUCKET = "container_images";

const CONTAINER_TYPES = ["20ft", "40ft", "20ft Reefer", "40ft Reefer"];
const CATEGORIES = ["vegetables", "fruits", "spices", "nuts", "eggs", "oils"];

function requireSupabase() {
  const supabase = getSupabase();
  if (!supabase) {
    alert(
      "Supabase env missing. Add NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
    return null;
  }
  return supabase;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type ProductLine = {
  commodity: string;
  packaging: string;
  quantity: string;
  quantityUnit: string;
  price: string;
};

/** ✅ Suspense boundary wrapper (required for useSearchParams in build) */
export default function CreateContainerListingPage() {
  return (
    <Suspense fallback={<div className="p-6 font-bold">Loading…</div>}>
      <CreateContainerListingInner />
    </Suspense>
  );
}

/** ✅ Your original code moved here (no logic/UI changes) */
function CreateContainerListingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const email = (params.get("email") ?? "").trim().toLowerCase(); // later we’ll lock behind login

  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ExporterRow | null>(null);

  // Common fields (same for all product lines in container)
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("Dubai");
  const [marketLocation, setMarketLocation] = useState("");

  const [containerType, setContainerType] = useState(CONTAINER_TYPES[0]);
  const [currency, setCurrency] = useState("USD");
  const [readyDate, setReadyDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  // Image upload
  const [file, setFile] = useState<File | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);

  // Multiple products lines
  const [lines, setLines] = useState<ProductLine[]>([
    { commodity: "", packaging: "", quantity: "", quantityUnit: "kg", price: "" },
  ]);

  // ✅ Load exporter profile by email (approved check)
  useEffect(() => {
    if (!email) return;

    (async () => {
      const supabase = requireSupabase();
      if (!supabase) return;

      setLoading(true);
      const { data, error } = await supabase
        .from(EXPORTERS_TABLE)
        .select("id,email,approved,status,company_name,full_name,phone,created_at")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setLoading(false);

      if (error) {
        alert(error.message);
        setProfile(null);
        return;
      }
      setProfile((data as any) ?? null);
    })();
  }, [email]);

  const isVerified = useMemo(() => {
    const st = (profile?.status ?? "").toString().toLowerCase();
    return profile?.approved === true || st === "approved";
  }, [profile]);

  function updateLine(i: number, patch: Partial<ProductLine>) {
    setLines((prev) => prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { commodity: "", packaging: "", quantity: "", quantityUnit: "kg", price: "" },
    ]);
  }

  function removeLine(i: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  async function uploadContainerImage(batchId: string) {
    if (!file) return null;

    const supabase = requireSupabase();
    if (!supabase) return null;

    const originTag = slugify(origin || "unknown-origin");
    const firstProduct = slugify(lines[0]?.commodity || "container");
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";

    // ✅ includes country + product tag in path
    const path = `${originTag}/${firstProduct}-${batchId}.${ext}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      upsert: true,
      contentType: file.type || "image/jpeg",
    });

    if (error) {
      alert(error.message);
      return null;
    }

    return path;
  }

  async function submitToAdmin() {
    const supabase = requireSupabase();
    if (!supabase) return;

    if (!email) return alert("Missing email. Open Create Listing from your account page.");
    if (!profile) return alert("Exporter profile not found.");
    if (!isVerified) return alert("Not approved yet. Please wait for admin approval.");

    // common validations
    if (!category.trim()) return alert("Choose category");
    if (!origin.trim()) return alert("Enter origin country");
    if (!destination.trim()) return alert("Enter destination");
    if (!marketLocation.trim()) return alert("Enter container market location");
    if (!readyDate.trim()) return alert("Select ready date");

    const whatsapp = (profile.phone ?? "").trim();
    if (!whatsapp) return alert("Phone missing in exporter profile. Update exporters.phone.");

    // product line validations
    const cleanLines = lines
      .map((l) => ({
        ...l,
        commodity: l.commodity.trim(),
        packaging: l.packaging.trim(),
        quantity: l.quantity.trim(),
        price: l.price.trim(),
      }))
      .filter((l) => l.commodity.length > 0);

    if (cleanLines.length === 0) return alert("Add at least 1 product name.");

    for (const l of cleanLines) {
      if (!l.packaging) return alert("Packaging is required for all products.");
      const q = Number(l.quantity);
      if (!l.quantity || !Number.isFinite(q) || q <= 0) return alert("Enter valid quantity for all products.");
      if (!l.quantityUnit) return alert("Quantity unit is required.");
      if (l.price) {
        const p = Number(l.price);
        if (!Number.isFinite(p) || p < 0) return alert("Enter valid price or leave blank.");
      }
    }

    setLoading(true);

    // ✅ batch id to connect multiple products of same container shipment
    const batchId = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`) as any;

    // ✅ upload image once, reuse for all rows
    const imgPath = uploadedPath ?? (await uploadContainerImage(batchId));
    if (file && !imgPath) {
      setLoading(false);
      return;
    }
    if (imgPath) setUploadedPath(imgPath);

    const rows = cleanLines.map((l) => ({
      exporter_uuid: profile.id,
      email,

      // common
      category,
      origin,
      destination,
      ready_date: readyDate,
      container_type: containerType,
      currency,
      whatsapp,
      market_location: marketLocation,
      image_path: imgPath,

      // grouping
      batch_id: batchId,

      // per product
      commodity: l.commodity,
      packaging: l.packaging,
      quantity: Number(l.quantity),
      quantity_unit: l.quantityUnit,
      price: l.price ? Number(l.price) : null,

      status: "pending",
      company_name: profile.company_name ?? null,
      contact_person: profile.full_name ?? null,
    }));

    const { error } = await supabase.from(LISTINGS_TABLE).insert(rows);

    setLoading(false);

    if (error) return alert(error.message);

    alert("✅ Submitted! Admin will review and publish soon.");
    router.push("/containers-listing/list");
  }

  return (
    <main className="min-h-screen bg-[#f6f8f7] px-4 sm:px-6 lg:px-12 pt-8 pb-20">
      <div className="max-w-[980px] mx-auto">
        <div className="flex items-center justify-between">
          <Link
            href="/containers-listing/list"
            className="w-11 h-11 rounded-full bg-white border border-[#e0e8e3] flex items-center justify-center font-black"
          >
            ←
          </Link>
          <div className="w-11 h-11 rounded-full bg-white border border-[#e0e8e3] flex items-center justify-center">
            📦
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <span className="px-4 py-2 rounded-full bg-[#eef2f0] text-[#111713] font-black border border-[#e0e8e3]">
            Email: {email || "—"}
          </span>
          <span className="px-4 py-2 rounded-full bg-[#eaf7ef] text-[#1db954] font-black border border-[#bfe8cd]">
            ✓ {isVerified ? "Approved" : "Not Approved"}
          </span>
        </div>

        <div className="mt-6 bg-white border border-[#e0e8e3] rounded-[36px] p-8 sm:p-12 shadow-[0_20px_60px_rgba(17,23,19,0.08)]">
          <h1 className="text-4xl sm:text-5xl font-black text-[#111713]">
            List a Container (Multiple Products)
          </h1>
          <p className="mt-3 text-[#648770] font-medium text-lg">
            {isVerified
              ? "Fill container details once, then add products. Submit goes to admin."
              : "Your exporter account is not approved yet. Wait for admin approval."}
          </p>
        </div>

        {/* Common container details */}
        <div className="mt-8 bg-white border border-[#e0e8e3] rounded-[36px] p-8 sm:p-12 shadow-[0_20px_60px_rgba(17,23,19,0.08)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SelectField
              label="Category"
              value={category}
              setValue={setCategory}
              options={CATEGORIES}
              disabled={!isVerified || loading}
            />
            <Field
              label="Container Market Location"
              value={marketLocation}
              setValue={setMarketLocation}
              disabled={!isVerified || loading}
              placeholder="e.g. Al Aweer Market - Block A, Yard 12"
            />
            <Field label="Origin Country" value={origin} setValue={setOrigin} disabled={!isVerified || loading} />
            <Field label="Destination" value={destination} setValue={setDestination} disabled={!isVerified || loading} />

            <SelectField
              label="Container Type"
              value={containerType}
              setValue={setContainerType}
              options={CONTAINER_TYPES}
              disabled={!isVerified || loading}
            />
            <SelectField
              label="Currency"
              value={currency}
              setValue={setCurrency}
              options={["USD", "AED", "INR", "EUR"]}
              disabled={!isVerified || loading}
            />
            <Field label="Ready Date (YYYY-MM-DD)" value={readyDate} setValue={setReadyDate} disabled={!isVerified || loading} />
          </div>

          <div className="mt-6">
            <div className="text-sm font-black text-[#111713]">Container Photo (one image for all products)</div>
            <input
              type="file"
              accept="image/*"
              disabled={!isVerified || loading}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-2 w-full rounded-[22px] border border-[#e0e8e3] px-5 py-4 outline-none font-semibold bg-white"
            />
            {uploadedPath && (
              <div className="mt-2 text-xs font-semibold text-[#648770] break-all">
                Uploaded path: <span className="text-[#111713]">{uploadedPath}</span>
              </div>
            )}
          </div>
        </div>

        {/* Product lines */}
        <div className="mt-8 bg-white border border-[#e0e8e3] rounded-[36px] p-8 sm:p-12 shadow-[0_20px_60px_rgba(17,23,19,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black text-[#111713]">Products in this Container</h2>
            <button
              type="button"
              onClick={addLine}
              disabled={!isVerified || loading}
              className="rounded-full h-11 px-5 bg-[#eef2f0] text-[#111713] font-black border border-[#e0e8e3] hover:bg-[#e7ecea] disabled:opacity-60"
            >
              + Add Product
            </button>
          </div>

          <div className="mt-6 space-y-5">
            {lines.map((l, i) => (
              <div key={i} className="rounded-[28px] border border-[#e0e8e3] bg-[#fbfcfb] p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-black text-[#648770]">Product #{i + 1}</div>
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    disabled={!isVerified || loading || lines.length === 1}
                    className="text-sm font-black text-[#111713] hover:text-red-600 disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field
                    label="Product Name"
                    value={l.commodity}
                    setValue={(v) => updateLine(i, { commodity: v })}
                    disabled={!isVerified || loading}
                  />
                  <Field
                    label="Packaging Type"
                    value={l.packaging}
                    setValue={(v) => updateLine(i, { packaging: v })}
                    disabled={!isVerified || loading}
                  />
                  <Field
                    label="Quantity"
                    value={l.quantity}
                    setValue={(v) => updateLine(i, { quantity: v })}
                    disabled={!isVerified || loading}
                  />
                  <SelectField
                    label="Quantity Unit"
                    value={l.quantityUnit}
                    setValue={(v) => updateLine(i, { quantityUnit: v })}
                    options={["kg", "tons", "boxes", "cartons", "units"]}
                    disabled={!isVerified || loading}
                  />
                  <Field
                    label="Price (optional)"
                    value={l.price}
                    setValue={(v) => updateLine(i, { price: v })}
                    disabled={!isVerified || loading}
                    placeholder="Leave empty if not fixed"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={submitToAdmin}
            disabled={!isVerified || loading}
            className="mt-8 w-full rounded-full px-6 py-5 bg-[#1db954] text-white font-black text-xl disabled:opacity-60"
          >
            {loading ? "Submitting..." : "Submit to Admin"}
          </button>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  setValue,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="text-sm font-black text-[#111713]">{label}</div>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="mt-2 w-full rounded-[22px] border border-[#e0e8e3] px-5 py-4 outline-none font-semibold disabled:bg-[#f6f8f7]"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  setValue,
  options,
  disabled,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  options: string[];
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <div className="text-sm font-black text-[#111713]">{label}</div>
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        className="mt-2 w-full rounded-[22px] border border-[#e0e8e3] px-5 py-4 outline-none font-black disabled:bg-[#f6f8f7]"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}