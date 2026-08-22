import { BRAND } from "@/constants/colors";
import AnimatedPressable from "@/components/AnimatedPressable";
import { planDisplayName, readPlanTier, savePlanTier, type PlanTier } from "@/lib/subscriptionPlan";
import { useAppSession } from "@/lib/appSession";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { safeBack } from "@/lib/nav";
import React, { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BUYER_TIERS: {
  id: PlanTier;
  name: string;
  price: string;
  period: string;
  features: string[];
  highlight: boolean;
}[] = [
  {
    id: "free",
    name: "Free Tier",
    price: "AED 0",
    period: "/ month",
    features: ["Browse ads", "Wishlist up to 5 items", "Basic inquiry box"],
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro Buyer",
    price: "AED 49",
    period: "/ month",
    features: ["Unlimited wishlist", "Priority inquiries", "Price alerts", "Early access ads"],
    highlight: true,
  },
  {
    id: "business",
    name: "Business",
    price: "AED 149",
    period: "/ month",
    features: ["Everything in Pro", "Bulk inquiry support", "Dedicated account manager", "Export reports"],
    highlight: false,
  },
];

const SELLER_TIERS: {
  id: PlanTier;
  name: string;
  price: string;
  period: string;
  features: string[];
  highlight: boolean;
}[] = [
  {
    id: "free",
    name: "Starter Seller",
    price: "AED 0",
    period: "/ month",
    features: ["Up to 3 active ads", "Basic analytics", "Standard listing placement"],
    highlight: false,
  },
  {
    id: "seller_pro",
    name: "Seller Pro",
    price: "AED 99",
    period: "/ month",
    features: ["Unlimited ads", "Featured placement", "View analytics", "Priority support"],
    highlight: true,
  },
  {
    id: "seller_enterprise",
    name: "Seller Enterprise",
    price: "AED 299",
    period: "/ month",
    features: ["Everything in Pro", "Dedicated rep", "Bulk upload", "Custom branding"],
    highlight: false,
  },
];

export default function UpgradeScreen() {
  const router = useRouter();
  const session = useAppSession();
  const isSeller = session.role === "seller";
  const tiers = isSeller ? SELLER_TIERS : BUYER_TIERS;
  const [selected, setSelected] = useState<PlanTier>("pro");
  const [currentPlan, setCurrentPlan] = useState<PlanTier>("free");

  useFocusEffect(
    useCallback(() => {
      readPlanTier().then((t) => {
        setCurrentPlan(t);
        if (t !== "free") setSelected(t);
        else setSelected(isSeller ? "seller_pro" : "pro");
      });
    }, [isSeller])
  );

  async function confirmPlan() {
    await savePlanTier(selected);
    Alert.alert(
      "Plan saved",
      `You're now on ${planDisplayName(selected)}. (Client-side preview — no payment connected.)`,
      [{ text: "OK", onPress: () => safeBack(router, "/(tabs)/account") }]
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => safeBack(router, "/(tabs)/account")} haptic={false}>
          <Ionicons name="close" size={24} color={BRAND.text} />
        </AnimatedPressable>
        <Text style={styles.headerTitle}>Upgrade Plan</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hero}>Choose your subscription</Text>
        <Text style={styles.heroSub}>
          Client-side preview — no payment processing connected yet.
        </Text>
        <Text style={styles.currentPlan}>
          Current: {planDisplayName(currentPlan)}
        </Text>

        {tiers.map((tier) => {
          const on = selected === tier.id;
          return (
            <AnimatedPressable
              key={tier.id}
              style={[styles.tierCard, on && styles.tierOn, tier.highlight && styles.tierHighlight]}
              onPress={() => setSelected(tier.id)}
            >
              {tier.highlight ? (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>Most Popular</Text>
                </View>
              ) : null}
              <Text style={styles.tierName}>{tier.name}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.tierPrice}>{tier.price}</Text>
                <Text style={styles.tierPeriod}>{tier.period}</Text>
              </View>
              {tier.features.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={16} color={BRAND.primary} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
              {on ? (
                <View style={styles.selectedMark}>
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </View>
              ) : null}
            </AnimatedPressable>
          );
        })}

        <AnimatedPressable style={styles.cta} onPress={confirmPlan}>
          <Text style={styles.ctaText}>
            Continue with {tiers.find((t) => t.id === selected)?.name}
          </Text>
        </AnimatedPressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.pageBg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: BRAND.text },
  content: { padding: 16, paddingBottom: 40 },
  hero: { fontSize: 24, fontWeight: "900", color: BRAND.text },
  heroSub: { marginTop: 6, color: BRAND.muted, fontWeight: "600", lineHeight: 20 },
  currentPlan: {
    marginTop: 8,
    marginBottom: 16,
    fontWeight: "700",
    color: BRAND.primary,
    fontSize: 13,
  },
  tierCard: {
    backgroundColor: BRAND.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: BRAND.border,
    position: "relative",
  },
  tierOn: { borderColor: BRAND.primary, backgroundColor: BRAND.primaryLight },
  tierHighlight: {},
  popularBadge: {
    position: "absolute",
    top: -10,
    right: 16,
    backgroundColor: BRAND.accent,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  popularText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  tierName: { fontSize: 18, fontWeight: "800", color: BRAND.text },
  priceRow: { flexDirection: "row", alignItems: "baseline", marginTop: 8, gap: 4 },
  tierPrice: { fontSize: 28, fontWeight: "900", color: BRAND.primary },
  tierPeriod: { color: BRAND.muted, fontWeight: "600" },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  featureText: { color: BRAND.text, fontWeight: "600", flex: 1 },
  selectedMark: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BRAND.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  cta: {
    marginTop: 8,
    backgroundColor: BRAND.primary,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  ctaText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
});
