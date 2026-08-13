import { NextRequest } from "next/server";
import PDFDocument from "pdfkit";
import { PRODUCTS, ProductCategory } from "@/lib/products";

export const runtime = "nodejs";

const ALLOWED_CATS: ProductCategory[] = [
  "vegetables",
  "fruits",
  "spices",
  "nuts",
  "eggs",
  "oils",
];

const CATEGORY_META: Record<ProductCategory, { title: string }> = {
  vegetables: { title: "Vegetables" },
  fruits: { title: "Fruits" },
  spices: { title: "Spices" },
  nuts: { title: "Nuts & Dry Fruits" },
  eggs: { title: "Eggs" },
  oils: { title: "Cooking Oils" },
};

function formatAED(n: number) {
  const num = Number.isFinite(n) ? n : 0;
  return `AED ${num.toFixed(2)}`;
}

function parseCategory(raw: string | null): ProductCategory {
  const c = (raw ?? "").toLowerCase();
  return ALLOWED_CATS.includes(c as ProductCategory)
    ? (c as ProductCategory)
    : "vegetables";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const cat = parseCategory(searchParams.get("category"));
  const meta = CATEGORY_META[cat];

  const search = (searchParams.get("search") ?? "").trim().toLowerCase();
  const origin = searchParams.get("origin") ?? "All";
  const type = (searchParams.get("type") ?? "All") as "All" | "Organic" | "Regular";
  const sort = (searchParams.get("sort") ?? "low") as "low" | "high";

  // ✅ Filter base list by category
  let list = PRODUCTS.filter((p) => p.category === cat);

  // ✅ Search
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

  // ✅ Origin filter (only if chosen)
  if (origin !== "All") {
    list = list.filter((p) => p.origin === origin);
  }

  // ✅ Type filter (only if chosen)
  if (type !== "All") {
    list = list.filter((p) => p.type === type);
  }

  // ✅ Sort by myPrice (as your client does)
  list.sort((a, b) =>
    sort === "low" ? a.myPrice - b.myPrice : b.myPrice - a.myPrice
  );

  // ===== PDF create =====
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c as Buffer));

  const pdfBufferPromise = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const rateLabel =
    cat === "vegetables" || cat === "fruits" ? "AL AWEER RATE" : "MARKET RATE";

  // Title
  doc.fontSize(16).font("Helvetica-Bold").text(`MyVegMarket - ${meta.title} Price Report`);
  doc.moveDown(0.2);

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor("gray")
    .text(`Generated: ${new Date().toLocaleString()}`);
  doc.fillColor("black");
  doc.moveDown(0.6);

  // Summary
  const totalMarket = list.reduce((sum, p) => sum + (p.marketAvg || 0), 0);
  const totalMy = list.reduce((sum, p) => sum + (p.myPrice || 0), 0);
  const totalSave = Math.max(0, totalMarket - totalMy);
  const savePct = totalMarket > 0 ? (totalSave / totalMarket) * 100 : 0;

  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(
      `Summary: Items ${list.length}  |  Total ${rateLabel}: ${formatAED(
        totalMarket
      )}  |  Total MyVegMarket: ${formatAED(totalMy)}  |  Savings: ${formatAED(
        totalSave
      )} (${savePct.toFixed(1)}%)`
    );

  doc.moveDown(0.6);

  // Filters line
  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("gray")
    .text(
      `Filters: Category ${meta.title} | Origin ${origin} | Type ${type} | Sort ${
        sort === "low" ? "Price (Low)" : "Price (High)"
      } | Search ${search ? `"${searchParams.get("search")}"` : "—"}`,
      { width: 520 }
    );

  doc.fillColor("black");
  doc.moveDown(0.8);

  // ===== Table layout =====
  const startX = 40;
  let y = doc.y;

  // Column widths (fit A4 well)
  const col = {
    product: 175,
    origin: 70,
    unit: 55,
    market: 80,
    my: 85,
    save: 55,
  };

  const rowH = 18;

  // Header
  doc.font("Helvetica-Bold").fontSize(9);
  doc.text("Product", startX, y, { width: col.product });
  doc.text("Origin", startX + col.product, y, { width: col.origin });
  doc.text("Unit", startX + col.product + col.origin, y, { width: col.unit });
  doc.text(rateLabel, startX + col.product + col.origin + col.unit, y, {
    width: col.market,
    align: "right",
  });
  doc.text("MyVegMarket", startX + col.product + col.origin + col.unit + col.market, y, {
    width: col.my,
    align: "right",
  });
  doc.text("Save", startX + col.product + col.origin + col.unit + col.market + col.my, y, {
    width: col.save,
    align: "right",
  });

  y += rowH;
  doc.moveTo(startX, y).lineTo(555, y).strokeColor("#dddddd").stroke();
  y += 8;

  doc.font("Helvetica").fontSize(9).strokeColor("#ffffff");

  // Rows
  for (const p of list) {
    if (y > 770) {
      doc.addPage();
      y = 40;
    }

    const savePctRow =
      p.marketAvg && p.marketAvg > 0
        ? (((p.marketAvg - p.myPrice) / p.marketAvg) * 100).toFixed(1)
        : "0.0";

    doc.text(p.name, startX, y, { width: col.product });
    doc.text(p.origin, startX + col.product, y, { width: col.origin });
    doc.text(p.unit, startX + col.product + col.origin, y, { width: col.unit });

    doc.text(formatAED(p.marketAvg), startX + col.product + col.origin + col.unit, y, {
      width: col.market,
      align: "right",
    });

    doc.text(formatAED(p.myPrice), startX + col.product + col.origin + col.unit + col.market, y, {
      width: col.my,
      align: "right",
    });

    doc.text(`${savePctRow}%`, startX + col.product + col.origin + col.unit + col.market + col.my, y, {
      width: col.save,
      align: "right",
    });

    y += rowH;
  }

  doc.end();

  const pdfBuffer = await pdfBufferPromise;

  // ✅ Response expects Uint8Array (not Buffer)
  const uint8 = new Uint8Array(pdfBuffer);

  return new Response(uint8, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="myvegmarket-${cat}-price-report.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
