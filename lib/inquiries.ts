import AsyncStorage from "@react-native-async-storage/async-storage";

export type Inquiry = {
  id: string;
  productTitle: string;
  message: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

const INQUIRY_KEY = "mv_inquiries_v1";

export async function readInquiries(): Promise<Inquiry[]> {
  try {
    const raw = await AsyncStorage.getItem(INQUIRY_KEY);
    return raw ? (JSON.parse(raw) as Inquiry[]) : [];
  } catch {
    return [];
  }
}

export async function writeInquiries(items: Inquiry[]) {
  await AsyncStorage.setItem(INQUIRY_KEY, JSON.stringify(items));
}

/** Derive FAQ-style Q&A pairs from recent inquiries */
export function inquiriesToFaq(items: Inquiry[]): { q: string; a: string }[] {
  const seen = new Set<string>();
  const faq: { q: string; a: string }[] = [];
  for (const inq of items) {
    const key = inq.productTitle.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    faq.push({
      q: `Inquiry about ${inq.productTitle}`,
      a: inq.message.length > 120 ? `${inq.message.slice(0, 117)}…` : inq.message,
    });
    if (faq.length >= 6) break;
  }
  return faq;
}
