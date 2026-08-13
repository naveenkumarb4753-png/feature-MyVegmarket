import { NextRequest } from "next/server";
import PDFDocument from "pdfkit";
import { PRODUCTS, ProductCategory } from "@/lib/products";

export const runtime = "nodejs";

const ALL_CATEGORIES: ProductCategory[] = [
  "vegetables",
  "fruits",
  "spices",
  "nuts",
  "eggs",
  "oils",
];

function formatAED(n: number) {
  const num = Number.isFinite(n) ? n : 0;
  return `AED ${num.toFixed(2)}`;
}

function labelCat(c: ProductCategory) {
  return c.charAt(0).toUpperCase() + c.slice(1);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const search = (searchParams.get("search") ?? "").trim().toLowerCase();
  const origin = searchParams.get("origin") ?? "All";
  const type = (searchParams.get("type") ?? "All") as "All" | "Organic" | "Regular";
  const sort = (searchParams.get("sort") ?? "low") as "low" | "high";

  const catsParam = searchParams.get("cats");
  const selectedCats: ProductCategory[] = catsParam
    ? (catsParam.split(",").filter(Boolean) as ProductCategory[])
    : [...ALL_CATEGORIES];

  // Filter
  let list = [...PRODUCTS];
  list = list.filter((p) => selectedCats.includes(p.category));

  if (search) {
    list = list.filter((p) => {
      const subtitle = (p.packaging ?? p.subtitle ?? p.unit ?? "").toLowerCase();
      return (
        p.name.toLowerCase().includes(search) ||
        subtitle.includes(search) ||
        p.origin.toLowerCase().includes(search)
      );
    });
  }

  if (origin !== "All") list = list.filter((p) => p.origin === origin);
  if (type !== "All") list = list.filter((p) => p.type === type);

  list.sort((a, b) =>
    sort === "low" ? a.marketAvg - b.marketAvg : b.marketAvg - a.marketAvg
  );

  // Create PDF
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c as Buffer));

  const pdfBufferPromise = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  // Header
  doc.fontSize(16).font("Helvetica-Bold").text("MyVegMarket - Al Aweer Price Report");
  doc.moveDown(0.3);
  doc.fontSize(10).font("Helvetica").fillColor("gray").text(
    `Generated: ${new Date().toLocaleString()}`
  );
  doc.fillColor("black");
  doc.moveDown(0.7);

  const catsText =
    selectedCats.length === ALL_CATEGORIES.length
      ? "All"
      : selectedCats.length === 0
      ? "None"
      : selectedCats.map(labelCat).join(", ");

  doc.fontSize(10).font("Helvetica-Bold").text(
    `Filters: Categories: ${catsText} | Origin: ${origin} | Type: ${type} | Sort: ${
      sort === "low" ? "Market (Low)" : "Market (High)"
    } | Search: ${search ? `"${searchParams.get("search")}"` : "—"}`,
    { width: 520 }
  );

  doc.moveDown(0.8);

  // Simple table
  const startX = 40;
  let y = doc.y;

  const col = { product: 240, origin: 120, unit: 70, rate: 90 };
  const rowH = 18;

  doc.font("Helvetica-Bold");
  doc.text("Product", startX, y, { width: col.product });
  doc.text("Origin", startX + col.product, y, { width: col.origin });
  doc.text("Unit", startX + col.product + col.origin, y, { width: col.unit });
  doc.text("Market Rate", startX + col.product + col.origin + col.unit, y, {
    width: col.rate,
    align: "right",
  });

  y += rowH + 6;
  doc.moveTo(startX, y).lineTo(555, y).strokeColor("#dddddd").stroke();
  y += 8;

  doc.font("Helvetica").strokeColor("#ffffff");

  for (const p of list) {
    if (y > 770) {
      doc.addPage();
      y = 40;
    }

    doc.text(p.name, startX, y, { width: col.product });
    doc.text(p.origin, startX + col.product, y, { width: col.origin });
    doc.text(p.unit, startX + col.product + col.origin, y, { width: col.unit });
    doc.text(formatAED(p.marketAvg), startX + col.product + col.origin + col.unit, y, {
      width: col.rate,
      align: "right",
    });

    y += rowH;
  }

  doc.end();

  const pdfBuffer = await pdfBufferPromise;

  // ✅ IMPORTANT: Response expects Uint8Array / ArrayBuffer, not Buffer
  const uint8 = new Uint8Array(pdfBuffer);

  return new Response(uint8, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        'attachment; filename="myvegmarket-al-aweer-price-report.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
