import { BRAND } from "@/constants/colors";
import VegLoader from "@/components/VegLoader";
import { readInquiries, type Inquiry } from "@/lib/inquiries";
import { containerLabel, formatPrice, produceImage } from "@/lib/produceUi";
import { planDisplayName, readPlanTier } from "@/lib/subscriptionPlan";
import { supabase } from "@/lib/supabase";
import { useAppSession } from "@/lib/appSession";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { safeBack } from "@/lib/nav";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AdRow = {
  id: string;
  title: string | null;
  price: number | null;
  currency: string | null;
  image_url: string | null;
  category: string | null;
  container_type: string | null;
  qty: number | null;
  is_active?: boolean | null;
  created_at?: string | null;
};

function mockViewCount(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000;
  return 12 + (h % 480);
}

function starRow(rating: number) {
  return Array.from({ length: 5 }, (_, i) => (
    <Ionicons
      key={i}
      name={i < rating ? "star" : "star-outline"}
      size={12}
      color={BRAND.gold}
    />
  ));
}

export default function SellerDashboard() {
  const session = useAppSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState<AdRow[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [planName, setPlanName] = useState("Free Tier");
  const [relisting, setRelisting] = useState<string | null>(null);

  const loadAds = useCallback(async () => {
    const { data } = await supabase
      .from("containers")
      .select("id,title,price,currency,image_url,category,container_type,qty,is_active,created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setAds((data as AdRow[]) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (session.role !== "seller") {
        setLoading(false);
        return;
      }
      loadAds();
      readInquiries().then(setInquiries);
      readPlanTier().then((t) => setPlanName(planDisplayName(t)));
    }, [session.role, loadAds])
  );

  async function handleRelist(ad: AdRow) {
    setRelisting(ad.id);
    const { error } = await supabase
      .from("containers")
      .update({ is_active: true, created_at: new Date().toISOString() })
      .eq("id", ad.id);
    setRelisting(null);
    if (error) {
      Alert.alert("Relist failed", error.message);
      return;
    }
    await loadAds();
    Alert.alert("Relisted", `"${ad.title || "Ad"}" is live again.`);
  }

  const totalViews = ads.reduce((sum, ad) => sum + mockViewCount(ad.id), 0);

  if (session.role !== "seller") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.denied}>
          <Text style={styles.deniedTitle}>Seller access only</Text>
          <Pressable onPress={() => safeBack(router, "/(tabs)/account")}>
            <Text style={styles.link}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) return <VegLoader context="ads" label="Loading your ads…" />;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>My Listings</Text>
        <Text style={styles.sub}>Manage listings, views, and inquiries</Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{ads.length}</Text>
            <Text style={styles.statLbl}>Total Ads</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{ads.filter((a) => a.is_active).length}</Text>
            <Text style={styles.statLbl}>Active</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{totalViews}</Text>
            <Text style={styles.statLbl}>Views</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Your Ads</Text>
        <View style={styles.adGrid}>
          {ads.map((ad) => (
            <View key={ad.id} style={styles.gridCard}>
              <Image
                source={{ uri: produceImage(ad.title, ad.category, ad.image_url) }}
                style={styles.gridThumb}
              />
              <View style={[styles.liveBadge, ad.is_active ? styles.liveOn : styles.liveOff]}>
                <Text style={styles.liveBadgeText}>{ad.is_active ? "Live" : "Inactive"}</Text>
              </View>
              <Text style={styles.gridTitle} numberOfLines={2}>{ad.title}</Text>
              <Text style={styles.gridMeta}>{containerLabel(ad.container_type, ad.qty)}</Text>
              <Text style={styles.gridPrice}>{formatPrice(ad.currency, ad.price)}</Text>
              <View style={styles.viewRow}>
                <Ionicons name="eye-outline" size={12} color={BRAND.muted} />
                <Text style={styles.viewCount}>{mockViewCount(ad.id)} views</Text>
              </View>
              <View style={styles.gridActions}>
                <Pressable
                  style={styles.gridBtn}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/post-ad",
                      params: { editId: ad.id, adData: JSON.stringify(ad) },
                    } as Href)
                  }
                >
                  <Text style={styles.gridBtnText}>Edit</Text>
                </Pressable>
                <Pressable
                  style={[styles.gridBtn, styles.relistBtn]}
                  onPress={() => handleRelist(ad)}
                  disabled={relisting === ad.id}
                >
                  <Text style={styles.relistBtnText}>
                    {relisting === ad.id ? "…" : "Relist"}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {ads.length === 0 ? (
          <Pressable style={styles.emptyCta} onPress={() => router.push("/(tabs)/post-ad" as Href)}>
            <Ionicons name="add-circle-outline" size={20} color={BRAND.primary} />
            <Text style={styles.emptyCtaText}>Post your first ad</Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.upgradeBanner} onPress={() => router.push("/upgrade" as Href)}>
          <View style={styles.upgradeIconBubble}>
            <Ionicons name="rocket-outline" size={18} color={BRAND.primary} />
          </View>
          <View style={styles.upgradeBannerCopy}>
            <Text style={styles.upgradeBannerTitle}>Boost visibility</Text>
            <Text style={styles.upgradeBannerSub}>Upgrade for featured placement & analytics • {planName}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={BRAND.muted} />
        </Pressable>

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Inquiry Feed</Text>
        {inquiries.length === 0 ? (
          <View style={styles.feedCard}>
            <Text style={styles.feedEmpty}>
              No inquiries yet — they will appear here like Google Reviews.
            </Text>
          </View>
        ) : (
          inquiries.map((inq, idx) => (
            <View key={inq.id} style={styles.reviewCard}>
              <View style={styles.reviewHead}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(inq.productTitle[0] || "U").toUpperCase()}
                  </Text>
                </View>
                <View style={styles.reviewMeta}>
                  <Text style={styles.reviewAuthor}>Buyer inquiry</Text>
                  <View style={styles.starRow}>{starRow(4 - (idx % 2))}</View>
                </View>
                <Text style={styles.reviewDate}>
                  {new Date(inq.createdAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                  })}
                </Text>
              </View>
              <Text style={styles.reviewProduct}>{inq.productTitle}</Text>
              <Text style={styles.reviewBody}>{inq.message}</Text>
              <View style={styles.reviewStatus}>
                <Ionicons
                  name={
                    inq.status === "approved"
                      ? "checkmark-circle"
                      : inq.status === "rejected"
                        ? "close-circle"
                        : "time"
                  }
                  size={14}
                  color={
                    inq.status === "approved"
                      ? BRAND.success
                      : inq.status === "rejected"
                        ? BRAND.danger
                        : BRAND.accent
                  }
                />
                <Text style={styles.reviewStatusText}>{inq.status}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.pageBg },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 26, fontWeight: "900", color: BRAND.text },
  sub: { marginTop: 4, color: BRAND.muted, fontWeight: "600", marginBottom: 16 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  stat: {
    flex: 1,
    backgroundColor: BRAND.surface,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  statNum: { fontSize: 20, fontWeight: "900", color: BRAND.primary },
  statLbl: { fontSize: 11, fontWeight: "700", color: BRAND.muted, marginTop: 2 },
  planBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: BRAND.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BRAND.border,
    marginBottom: 20,
  },
  planLabel: { fontSize: 11, fontWeight: "700", color: BRAND.muted },
  planName: { fontSize: 16, fontWeight: "900", color: BRAND.text, marginTop: 2 },
  upgradeCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: BRAND.accent,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  upgradeText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: BRAND.text, marginBottom: 12 },
  adGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridCard: {
    width: "47%",
    backgroundColor: BRAND.surface,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: BRAND.border,
    position: "relative",
  },
  gridThumb: { width: "100%", height: 90, borderRadius: 10 },
  liveBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveOn: { backgroundColor: BRAND.primaryLight },
  liveOff: { backgroundColor: "#F3F4F6" },
  liveBadgeText: { fontSize: 9, fontWeight: "800", color: BRAND.primary },
  gridTitle: { marginTop: 8, fontSize: 13, fontWeight: "800", color: BRAND.text },
  gridMeta: { marginTop: 2, fontSize: 10, color: BRAND.muted, fontWeight: "600" },
  gridPrice: { marginTop: 4, fontWeight: "800", color: BRAND.primary, fontSize: 13 },
  viewRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  viewCount: { fontSize: 10, color: BRAND.muted, fontWeight: "600" },
  gridActions: { flexDirection: "row", gap: 6, marginTop: 8 },
  gridBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: BRAND.primaryLight,
  },
  gridBtnText: { color: BRAND.primary, fontWeight: "800", fontSize: 11 },
  relistBtn: { backgroundColor: BRAND.accentSoft },
  relistBtnText: { color: BRAND.accent, fontWeight: "800", fontSize: 11 },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 20,
    marginTop: 8,
  },
  emptyCtaText: { color: BRAND.primary, fontWeight: "800" },
  upgradeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: BRAND.primaryLight,
    shadowColor: BRAND.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  upgradeIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: BRAND.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeBannerCopy: { flex: 1 },
  upgradeBannerTitle: { fontWeight: "800", color: BRAND.text, fontSize: 14 },
  upgradeBannerSub: { marginTop: 2, fontSize: 12, color: BRAND.muted, fontWeight: "600" },
  feedCard: {
    backgroundColor: BRAND.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  feedEmpty: { color: BRAND.muted, fontWeight: "600", lineHeight: 20 },
  reviewCard: {
    backgroundColor: BRAND.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  reviewHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BRAND.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontWeight: "900", color: BRAND.primary, fontSize: 14 },
  reviewMeta: { flex: 1 },
  reviewAuthor: { fontWeight: "800", color: BRAND.text, fontSize: 13 },
  starRow: { flexDirection: "row", gap: 2, marginTop: 2 },
  reviewDate: { fontSize: 11, color: BRAND.muted, fontWeight: "600" },
  reviewProduct: { marginTop: 8, fontWeight: "800", color: BRAND.primary, fontSize: 12 },
  reviewBody: { marginTop: 6, color: BRAND.text, lineHeight: 20, fontWeight: "600", fontSize: 14 },
  reviewStatus: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  reviewStatusText: { fontSize: 11, fontWeight: "700", color: BRAND.muted, textTransform: "capitalize" },
  denied: { flex: 1, alignItems: "center", justifyContent: "center" },
  deniedTitle: { fontSize: 18, fontWeight: "800", color: BRAND.text },
  link: { marginTop: 12, color: BRAND.primary, fontWeight: "800" },
});
