import AsyncStorage from "@react-native-async-storage/async-storage";

export type PlanTier = "free" | "pro" | "business" | "seller_pro" | "seller_enterprise";

const PLAN_KEY = "mv_subscription_plan_v1";

export async function readPlanTier(): Promise<PlanTier> {
  try {
    const raw = await AsyncStorage.getItem(PLAN_KEY);
    if (!raw) return "free";
    return raw as PlanTier;
  } catch {
    return "free";
  }
}

export async function savePlanTier(tier: PlanTier) {
  await AsyncStorage.setItem(PLAN_KEY, tier);
}

export function planDisplayName(tier: PlanTier): string {
  switch (tier) {
    case "pro":
      return "Pro Buyer";
    case "business":
      return "Business";
    case "seller_pro":
      return "Seller Pro";
    case "seller_enterprise":
      return "Seller Enterprise";
    default:
      return "Free Tier";
  }
}
