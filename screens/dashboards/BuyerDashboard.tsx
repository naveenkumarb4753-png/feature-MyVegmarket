import { BRAND } from "@/constants/colors";
import { readInquiries, type Inquiry } from "@/lib/inquiries";
import { planDisplayName, readPlanTier } from "@/lib/subscriptionPlan";
import { useAppSession } from "@/lib/appSession";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BuyerDashboard() {
  const session = useAppSession();
  const router = useRouter();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [planName, setPlanName] = useState("Free Tier");

  useFocusEffect(
    useCallback(() => {
      readInquiries().then(setInquiries);
      readPlanTier().then((t) => setPlanName(planDisplayName(t)));
    }, [])
  );

  const pendingItems: any[] = [];

  const pendingInquiries = inquiries.filter((i) => i.status === "pending").length;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.topBar}>
        <Text style={styles.title}>My Dashboard</Text>
        {session.isLoggedIn ? (
          <Pressable style={styles.wishBtn} onPress={() => session.setWishlistOpen(true)}>
            <Ionicons name="heart" size={20} color={BRAND.primary} />
            {session.wishlist.length > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{session.wishlist.length}</Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.tierCard}>
          <View style={styles.tierHeader}>
            <View>
              <Text style={styles.tierLabel}>Current Plan</Text>
              <Text style={styles.tierName}>{planName}</Text>
            </View>
            <View style={styles.tierIcon}>
              <Ionicons name="ribbon-outline" size={22} color={BRAND.gold} />
            </View>
          </View>
          <Pressable style={styles.upgradeBtn} onPress={() => router.push("/upgrade" as Href)}>
            <Text style={styles.upgradeBtnText}>Upgrade Subscription</Text>
            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
          </Pressable>
        </View>

        <Pressable style={styles.inquiryCard} onPress={() => router.push("/inquiry-box" as Href)}>
          <Ionicons name="mail-unread-outline" size={24} color={BRAND.primary} />
          <View style={styles.inquiryCopy}>
            <Text style={styles.inquiryTitle}>Inquiry Box</Text>
            <Text style={styles.inquirySub}>
              {inquiries.length === 0
                ? "Track your messages and status"
                : `${inquiries.length} sent · ${pendingInquiries} pending`}
            </Text>
          </View>
          {pendingInquiries > 0 ? (
            <View style={styles.inqBadge}>
              <Text style={styles.inqBadgeText}>{pendingInquiries}</Text>
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={18} color={BRAND.muted} />
          )}
        </Pressable>

        {inquiries.length > 0 ? (
          <View style={styles.statusSection}>
            <Text style={styles.sectionTitle}>Inquiry Status</Text>
            {inquiries.slice(0, 5).map((inq) => (
              <View key={inq.id} style={styles.statusRow}>
                <View style={styles.statusDot}>
                  <Ionicons
                    name={
                      inq.status === "approved"
                        ? "checkmark-circle"
                        : inq.status === "rejected"
                          ? "close-circle"
                          : "time-outline"
                    }
                    size={18}
                    color={
                      inq.status === "approved"
                        ? BRAND.success
                        : inq.status === "rejected"
                          ? BRAND.danger
                          : BRAND.accent
                    }
                  />
                </View>
                <View style={styles.statusBody}>
                  <Text style={styles.statusTitle} numberOfLines={1}>{inq.productTitle}</Text>
                  <Text style={styles.statusMeta}>
                    {inq.status === "pending"
                      ? "Awaiting response"
                      : inq.status.charAt(0).toUpperCase() + inq.status.slice(1)}
                  </Text>
                </View>
                <Text style={styles.statusDate}>
                  {new Date(inq.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {pendingItems.length > 0 ? (
          <View style={styles.pendingSection}>
            <Text style={styles.sectionTitle}>Approval Pending</Text>
            {pendingItems.map((item) => (
              <View key={item.id} style={styles.pendingCard}>
                <Ionicons name="time-outline" size={18} color={BRAND.accent} />
                <View style={styles.pendingBody}>
                  <Text style={styles.pendingTitle}>{item.productTitle}</Text>
                  <Text style={styles.pendingStatus}>Waiting for admin approval</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Wishlist</Text>
        {session.wishlist.length === 0 ? (
          <Text style={styles.empty}>Save ads with the heart icon to see them here.</Text>
        ) : (
          session.wishlist.map((item) => (
            <Pressable
              key={item.id}
              style={styles.wishRow}
              onPress={() => session.openAdInsights(JSON.stringify(item))}
            >
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
              ) : (
                <View style={styles.thumbFallback}>
                  <Ionicons name="leaf" size={16} color={BRAND.primary} />
                </View>
              )}
              <View style={styles.wishBody}>
                <Text style={styles.wishTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.wishMeta}>{item.priceLabel}</Text>
                {session.isWishlistPending(item.id) ? (
                  <View style={styles.pendingBadge}>
                    <Ionicons name="time-outline" size={12} color="#C2410C" />
                    <Text style={styles.pendingBadgeText}>Approval Pending</Text>
                  </View>
                ) : null}
              </View>
              <Ionicons name="heart" size={18} color="#E11D48" />
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.pageBg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  title: { fontSize: 22, fontWeight: "900", color: BRAND.text },
  wishBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: BRAND.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: BRAND.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  content: { padding: 16, paddingBottom: 32 },
  tierCard: {
    backgroundColor: BRAND.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
    marginBottom: 14,
  },
  tierHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tierIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  tierLabel: { fontSize: 12, fontWeight: "700", color: BRAND.muted },
  tierName: { fontSize: 20, fontWeight: "900", color: BRAND.text, marginTop: 4 },
  upgradeBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: BRAND.primary,
    borderRadius: 999,
    paddingVertical: 12,
  },
  upgradeBtnText: { color: "#FFFFFF", fontWeight: "800" },
  inquiryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: BRAND.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
    marginBottom: 20,
  },
  inquiryCopy: { flex: 1 },
  inquiryTitle: { fontSize: 16, fontWeight: "800", color: BRAND.text },
  inquirySub: { marginTop: 2, fontSize: 13, color: BRAND.muted, fontWeight: "600" },
  inqBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: BRAND.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  inqBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  statusSection: { marginBottom: 20 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: BRAND.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  statusDot: {},
  statusBody: { flex: 1 },
  statusTitle: { fontWeight: "800", color: BRAND.text, fontSize: 14 },
  statusMeta: { marginTop: 2, fontSize: 11, color: BRAND.muted, fontWeight: "600" },
  statusDate: { fontSize: 11, color: BRAND.muted, fontWeight: "600" },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: BRAND.text, marginBottom: 12 },
  pendingSection: { marginBottom: 20 },
  pendingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: BRAND.accentSoft,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  pendingBody: { flex: 1 },
  pendingTitle: { fontWeight: "800", color: BRAND.text },
  pendingStatus: { marginTop: 2, fontSize: 12, color: BRAND.accent, fontWeight: "700" },
  empty: { color: BRAND.muted, fontWeight: "600", lineHeight: 20 },
  wishRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: BRAND.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  thumb: { width: 48, height: 48, borderRadius: 10 },
  thumbFallback: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: BRAND.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  wishBody: { flex: 1 },
  wishTitle: { fontWeight: "800", color: BRAND.text },
  wishMeta: { marginTop: 2, fontSize: 12, color: BRAND.muted, fontWeight: "600" },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "#FFF7ED",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pendingBadgeText: { fontSize: 11, fontWeight: "800", color: "#C2410C" },
});
