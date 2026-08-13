import ProductDetailClient from "@/components/ProductDetailClient";
import { getProductBySlug } from "@/lib/productsDb";
import { notFound } from "next/navigation";

// ✅ CHANGE ONLY THIS LINE:
// export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function Page({
  params,
  searchParams,
}: {
  // ✅ Next.js 16: these can be Promises
  params: Promise<{ slug: string }> | { slug: string };
  searchParams?: Promise<{ lite?: string }> | { lite?: string };
}) {
  // ✅ Unwrap params/searchParams safely
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = searchParams
    ? await Promise.resolve(searchParams)
    : {};

  const slug = (resolvedParams?.slug ?? "").trim();

  // ✅ invalid / missing slug => 404 (no runtime crash)
  if (!slug || slug === "undefined" || slug === "null") {
    return notFound();
  }

  // ✅ get product
  let product;
  try {
    product = await getProductBySlug(slug);

    // Our getProductBySlug returns null for invalid/not found
    if (!product) return notFound();
  } catch (e: any) {
    // not found → 404
    if (String(e?.message || "").toLowerCase().includes("not found")) {
      return notFound();
    }
    // duplicates/real errors → throw
    throw e;
  }

  const isAlAweerLite =
    resolvedSearchParams?.lite === "1" || resolvedSearchParams?.lite === "true";

  return <ProductDetailClient product={product} isAlAweerLite={isAlAweerLite} />;
}