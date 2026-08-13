import CategoryClient from "@/components/CategoryClient";
import { getProductsByCategory } from "@/lib/productsDb";

export const revalidate = 60;

const ALLOWED = ["vegetables", "fruits", "spices", "nuts", "eggs", "oils"] as const;
type DbCategory = (typeof ALLOWED)[number];

export default async function Page({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: raw } = await params;

  const category = (raw ?? "").trim().toLowerCase() as DbCategory;

  if (!ALLOWED.includes(category)) {
    return (
      <main className="bg-[#f6f8f7] min-h-screen px-6 lg:px-20 pt-10 pb-24">
        <div className="max-w-[1400px] mx-auto">
          <h1 className="text-2xl font-bold text-[#111713]">Category not found</h1>
          <p className="text-[#648770] mt-2">Please open a valid category from Home.</p>
        </div>
      </main>
    );
  }

  const products = await getProductsByCategory(category);
  return <CategoryClient category={category} products={products} />;
}