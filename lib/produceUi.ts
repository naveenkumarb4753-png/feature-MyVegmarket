import { BRAND, CATEGORY_COLORS } from "@/constants/colors";
import { localProduceImage } from "@/lib/localProduce";
import type { ImageSourcePropType } from "react-native";

// Locally bundled category hero images (downloaded from Unsplash)
const CAT_FRUITS = require("../assets/images/categories/fruits.jpg");
const CAT_VEGETABLES = require("../assets/images/categories/vegetables.jpg");
const CAT_SPICES = require("../assets/images/categories/spices.jpg");


export const GREEN = BRAND.primary;
export const PAGE_BG = BRAND.pageBg;
export const TEXT = BRAND.text;
export const MUTED = BRAND.muted;

export const HD_IMAGES = {
  grapes: "https://images.unsplash.com/photo-1596368708386-5a046f4f6c17?q=80&w=600&auto=format&fit=crop",
  oranges: "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?q=80&w=600&auto=format&fit=crop",
  apples: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?q=80&w=600&auto=format&fit=crop",
  tomatoes: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?q=80&w=600&auto=format&fit=crop",
  vegetables: CAT_VEGETABLES,
  fruits: CAT_FRUITS,
  spices: CAT_SPICES,
  nuts: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?q=80&w=600&auto=format&fit=crop",
  herbs: "https://images.unsplash.com/photo-1515586000433-45406d8e6662?q=80&w=600&auto=format&fit=crop",
  beans: "https://images.unsplash.com/photo-1551462147-37885acc36f1?q=80&w=600&auto=format&fit=crop",
  peppers: "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?q=80&w=600&auto=format&fit=crop",
  hero: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?q=80&w=800&auto=format&fit=crop",
  eggs: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?q=80&w=600&auto=format&fit=crop",
  oils: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?q=80&w=600&auto=format&fit=crop",
  cucumber: "https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?q=80&w=600&auto=format&fit=crop",
  onion: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cf?q=80&w=600&auto=format&fit=crop",
  mango: "https://images.unsplash.com/photo-1553279768-865429fa0078?q=80&w=600&auto=format&fit=crop",
  banana: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?q=80&w=600&auto=format&fit=crop",
  strawberry: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?q=80&w=600&auto=format&fit=crop",
  cherry: "https://images.unsplash.com/photo-1528825871115-3581a5387919?q=80&w=600&auto=format&fit=crop",
};

// Local bundled images are resolved by localProduce.ts (products/ directory).
// This proxy map satisfies callers that key into LOCAL_IMAGES by name.
// The actual resolution goes through localProduceImage() at runtime.
export const LOCAL_IMAGES = {
  grapes: { uri: HD_IMAGES.grapes },
  oranges: { uri: HD_IMAGES.oranges },
  apples: { uri: HD_IMAGES.apples },
  tomatoes: { uri: HD_IMAGES.tomatoes },
  // Local require() images are passed directly (no { uri } wrapper needed)
  vegetables: CAT_VEGETABLES,
  fruits: CAT_FRUITS,
  spices: CAT_SPICES,
  nuts: { uri: HD_IMAGES.nuts },
  herbs: { uri: HD_IMAGES.herbs },
  beans: { uri: HD_IMAGES.beans },
  peppers: { uri: HD_IMAGES.peppers },
  hero: { uri: HD_IMAGES.hero },
  eggs: { uri: HD_IMAGES.eggs },
  oils: { uri: HD_IMAGES.oils },
  cucumber: { uri: HD_IMAGES.cucumber },
  onion: { uri: HD_IMAGES.onion },
  mango: { uri: HD_IMAGES.mango },
  banana: { uri: HD_IMAGES.banana },
  strawberry: { uri: HD_IMAGES.strawberry },
  cherry: { uri: HD_IMAGES.cherry },
};

export type ProduceImageKey = keyof typeof LOCAL_IMAGES;
export type ProduceImageStage = "remote" | "local" | "fallback";

// Re-export category accents from the upgraded brand tokens
export const CATEGORY_ACCENTS: Record<
  string,
  { bg: string; accent: string; pill: string; label: string }
> = CATEGORY_COLORS;

const FLAG_MAP: Record<string, string> = {
  peru: "🇵🇪",
  "south africa": "🇿🇦",
  poland: "🇵🇱",
  india: "🇮🇳",
  china: "🇨🇳",
  egypt: "🇪🇬",
  turkey: "🇹🇷",
  spain: "🇪🇸",
  italy: "🇮🇹",
  kenya: "🇰🇪",
  morocco: "🇲🇦",
  brazil: "🇧🇷",
  chile: "🇨🇱",
  uae: "🇦🇪",
  "united arab emirates": "🇦🇪",
  pakistan: "🇵🇰",
  iran: "🇮🇷",
  lebanon: "🇱🇧",
  jordan: "🇯🇴",
  netherlands: "🇳🇱",
  australia: "🇦🇺",
  "new zealand": "🇳🇿",
  usa: "🇺🇸",
  "united states": "🇺🇸",
  california: "🇺🇸",
  mexico: "🇲🇽",
  thailand: "🇹🇭",
  vietnam: "🇻🇳",
  france: "🇫🇷",
  germany: "🇩🇪",
};

export function countryFlag(origin?: string | null) {
  if (!origin) return "🌍";
  const key = origin.trim().toLowerCase();
  return FLAG_MAP[key] || "🌍";
}

export function resolveProduceKey(title?: string | null, category?: string | null): ProduceImageKey {
  const hay = `${title || ""} ${category || ""}`.toLowerCase();
  if (hay.includes("strawberry")) return "strawberry";
  if (hay.includes("mango") || hay.includes("mago")) return "mango";
  if (hay.includes("cherry")) return "cherry";
  if (hay.includes("grape")) return "grapes";
  if (hay.includes("orange")) return "oranges";
  if (hay.includes("apple")) return "apples";
  if (hay.includes("tomato")) return "tomatoes";
  if (hay.includes("onion")) return "onion";
  if (hay.includes("cucumber")) return "cucumber";
  if (hay.includes("banana")) return "banana";
  if (hay.includes("pepper") || hay.includes("chilli") || hay.includes("chili")) return "peppers";
  if (hay.includes("bean")) return "beans";
  if (hay.includes("spice") || hay.includes("herb") || hay.includes("ginger") || hay.includes("garlic"))
    return "spices";
  if (hay.includes("nut") || hay.includes("dry") || hay.includes("coconut")) return "nuts";
  if (hay.includes("egg")) return "eggs";
  if (hay.includes("oil")) return "oils";
  if (hay.includes("fruit") || hay.includes("berry") || hay.includes("plum")) return "fruits";
  if (hay.includes("veg")) return "vegetables";
  // Category-level fallbacks
  if ((category || "").toLowerCase().includes("fruit")) return "fruits";
  if ((category || "").toLowerCase().includes("spice")) return "spices";
  return "vegetables";
}

export function normalizeRemoteImage(url?: string | null) {
  if (!url || typeof url !== "string") return null;
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return `https://myvegmarket.com${url}`;
  return url;
}

/** Returns an ImageSourcePropType for a category key (handles local require() & remote URLs). */
export function resolveHDImageSource(key: keyof typeof HD_IMAGES): ImageSourcePropType {
  const val = HD_IMAGES[key];
  if (!val) return CAT_VEGETABLES;
  if (typeof val === "number" || typeof val === "object") return val as ImageSourcePropType;
  return { uri: val as string };
}

export function produceImage(title?: string | null, category?: string | null, fallback?: string | null) {
  const remote = normalizeRemoteImage(fallback);
  if (remote) return remote;
  const key = resolveProduceKey(title, category);
  const val = HD_IMAGES[key] || HD_IMAGES.vegetables;
  // Return plain string only for remote URLs; local require() return directly
  if (typeof val === "string") return val;
  return val; // require() module reference
}

export function produceImageSource(
  title?: string | null,
  category?: string | null,
  imageUrl?: string | null,
  stage: ProduceImageStage = imageUrl ? "remote" : "local"
): ImageSourcePropType {
  if (stage === "remote") {
    const remote = normalizeRemoteImage(imageUrl);
    if (remote) return { uri: remote };
    stage = "local";
  }
  if (stage === "local") {
    const local = localProduceImage(title, category);
    if (local) return local;
    const key = resolveProduceKey(title, category);
    return resolveHDImageSource(key);
  }
  const val = produceImage(title, category, null);
  if (typeof val === "string") return { uri: val };
  return val as ImageSourcePropType;
}

export function categoryAccent(category?: string | null) {
  const value = (category || "").toLowerCase();
  if (value.includes("veg")) return CATEGORY_COLORS.vegetables;
  if (value.includes("fruit")) return CATEGORY_COLORS.fruits;
  if (value.includes("spice") || value.includes("herb")) return CATEGORY_COLORS.spices;
  if (value.includes("nut") || value.includes("dry")) return CATEGORY_COLORS.nuts;
  if (value.includes("egg")) return CATEGORY_COLORS.eggs;
  if (value.includes("oil")) return CATEGORY_COLORS.oils;
  if (value.includes("herb")) return CATEGORY_COLORS.herbs;
  return CATEGORY_COLORS.default;
}

export function formatPrice(currency: string | null | undefined, price: number | null | undefined) {
  if (price == null) return "Price on request";
  const cur = (currency || "AED").toUpperCase();
  return `${cur} ${Number(price).toLocaleString()}`;
}

export function containerLabel(type?: string | null, qty?: number | null) {
  const size = type || "40ft Container";
  const count = qty && qty > 0 ? qty : 1;
  return `${count} x ${size}`;
}

export function formatKgRange(min?: number | null, max?: number | null) {
  if (min == null && max == null) return "Price updating";
  const lo = Number(min ?? max);
  const hi = Number(max ?? min);
  if (Number.isNaN(lo)) return "Price updating";
  if (Number.isNaN(hi) || hi === lo) return `AED ${lo.toFixed(2)} / Kg`;
  return `AED ${lo.toFixed(2)}–${hi.toFixed(2)} / Kg`;
}

export function formatArrived(dateStr?: string | null) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function isUpcoming(dateStr?: string | null) {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() > today.getTime();
}

export function isNewListing(createdAt?: string | null) {
  if (!createdAt) return false;
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return false;
  const diff = Date.now() - created.getTime();
  return diff < 1000 * 60 * 60 * 24 * 7;
}

export function matchCategory(value: string | null | undefined, chip: string) {
  if (chip === "All") return true;
  const v = (value || "").toLowerCase();
  const c = chip.toLowerCase();
  if (c === "fruits") return v.includes("fruit");
  if (c === "vegetables") return v.includes("veg");
  if (c === "spices") return v.includes("spice") || v.includes("herb");
  if (c === "nuts & dry fruits") return v.includes("nut") || v.includes("dry");
  if (c === "nuts") return v.includes("nut") || v.includes("dry");
  if (c === "eggs") return v.includes("egg");
  if (c === "oils") return v.includes("oil");
  if (c === "herbs") return v.includes("herb");
  return v.includes(c);
}
