import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type SearchItem = {
  id: string;
  name: string;
  origin: string;
  unit: string;
  category: string;
  image: string;
};

export async function getSearchIndex(): Promise<SearchItem[]> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id,slug,name,category,unit,origin_country,image_url")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .limit(1500);

  if (error) return [];

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const BUCKET = "product_images";

  const toPublic = (path: string | null) => {
    if (!path) return "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=60";
    if (path.startsWith("http")) return path;
    const clean = path.replace(/^\/+/, "");
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${clean}`;
  };

  return ((data as any[]) ?? []).map((p) => ({
    id: p.slug || p.id,
    name: p.name || "",
    origin: p.origin_country || "—",
    unit: p.unit || "",
    category: p.category || "",
    image: toPublic(p.image_url),
  }));
}