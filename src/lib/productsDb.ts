import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type DbCategory =
  | "vegetables"
  | "fruits"
  | "spices"
  | "nuts"
  | "eggs"
  | "oils";

export type ShipmentMode = "air" | "sea" | "road" | "mixed";

export type DbProduct = {
  id: string;
  slug: string;
  name: string;
  category: DbCategory;
  unit: string | null;
  packaging: string | null;
  origin_country: string | null;

  // ✅ NEW
  shipment_mode: ShipmentMode | null;

  image_url: string | null;
  image_public_url: string | null;

  market_price_aed: number | null;
  myveg_price_aed: number | null;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const BUCKET = "product_images";

function toPublicImageUrl(path: string | null) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const clean = path.replace(/^\/+/, "");
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${clean}`;
}

export async function getProductsByCategory(category: DbCategory) {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select(
      "id,slug,name,category,unit,packaging,origin_country,shipment_mode,image_url,market_price_aed,myveg_price_aed"
    )
    .eq("active", true)
    .eq("category", category)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Omit<DbProduct, "image_public_url">[];
  return rows.map((r) => ({
    ...r,
    image_public_url: toPublicImageUrl(r.image_url),
  })) as DbProduct[];
}

/**
 * ✅ Safe version:
 * - Returns null for missing/invalid slug or not-found
 * - Still throws for real errors like duplicates
 */
export async function getProductBySlug(slug: string) {
  const cleanSlug = (slug ?? "").trim();

  // ✅ Do NOT throw for bad route param; let page show 404
  if (!cleanSlug || cleanSlug === "undefined" || cleanSlug === "null") {
    return null as any; // (keeps compatibility; page handles null)
  }

  // ✅ Fetch up to 2 rows so we can detect duplicates safely
  const { data, error } = await supabaseAdmin
    .from("products")
    .select(
      "id,slug,name,category,unit,packaging,origin_country,shipment_mode,image_url,market_price_aed,myveg_price_aed"
    )
    .eq("active", true)
    .eq("slug", cleanSlug)
    .limit(2000);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Omit<DbProduct, "image_public_url">[];

  // ✅ Not found => return null (no crash)
  if (rows.length === 0) return null as any;

  // ✅ Duplicate is still a real issue: keep throwing
  if (rows.length > 1) {
    throw new Error(
      `Duplicate product slug found in DB: "${cleanSlug}". Make slug UNIQUE (products.slug).`
    );
  }

  const row = rows[0];
  return {
    ...row,
    image_public_url: toPublicImageUrl(row.image_url),
  } as DbProduct;
}
