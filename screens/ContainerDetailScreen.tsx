import AnimatedPressable from "@/components/AnimatedPressable";
import EmptyState from "@/components/EmptyState";
import VegLoader from "@/components/VegLoader";
import { BRAND } from "@/constants/colors";
import { useAppSession } from "@/lib/appSession";
import { safeBack } from "@/lib/nav";
import {
  categoryAccent,
  containerLabel,
  formatArrived,
  formatPrice,
  isNewListing,
  produceImage
} from "@/lib/produceUi";
import { isVerifiedAdmin } from "@/lib/rolesMobile";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ContainerItem = {
  id: string;
  title: string | null;
  packaging: string | null;
  packaging_type?: string | null;
  package_count?: number | null;
  weight_per_package_kg?: number | null;
  rate_type?: string | null;
  rate?: number | null;
  qty: number | null;
  quantity_unit: string | null;
  price: number | null;
  currency: string | null;
  route_from: string | null;
  route_to: string | null;
  availability_date: string | null;
  image_url: string | null;
  company_name: string | null;
  market_location: string | null;
  container_type: string | null;
  category: string | null;
  created_at?: string | null;
};

function displayRate(item: ContainerItem) {
  const value = item.rate ?? item.price;
  return formatPrice(item.currency || "AED", value);
}

function displayRateUnit(item: ContainerItem) {
  if (item.rate_type === "per_kg") return "Per kg";
  if (item.rate_type === "per_piece") return "Per Piece";
  return "Per Container";
}

function displayContainer(item: ContainerItem) {
  return item.container_type || containerLabel(item.container_type, item.qty);
}

function displayPackagingType(item: ContainerItem) {
  return item.packaging_type || item.packaging || null;
}

function displayPackageCount(item: ContainerItem) {
  if (item.package_count != null) return String(item.package_count);
  if (item.qty != null) return String(item.qty);
  return null;
}

function displayWeightPerPackage(item: ContainerItem) {
  if (item.weight_per_package_kg != null) {
    return `${item.weight_per_package_kg} kg`;
  }
  return null;
}

function displayTotalWeight(item: ContainerItem) {
  if (
    item.package_count != null &&
    item.weight_per_package_kg != null
  ) {
    return `${item.package_count * item.weight_per_package_kg} kg`;
  }
  return null;
}

function MetaRow({
  icon,
  label,
  value,
  accentColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accentColor?: string;
}) {
  return (
    <View style={metaStyles.row}>
      <View style={[metaStyles.iconWrap, accentColor ? { backgroundColor: accentColor + "18" } : undefined]}>
        <Ionicons name={icon} size={16} color={accentColor || BRAND.muted} />
      </View>
      <View style={metaStyles.content}>
        <Text style={metaStyles.label}>{label}</Text>
        <Text style={metaStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const metaStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.borderLight,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: BRAND.pageBg,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1 },
  label: { fontSize: 11, fontWeight: "700", color: BRAND.muted, textTransform: "uppercase", letterSpacing: 0.4 },
  value: { fontSize: 14, fontWeight: "700", color: BRAND.text, marginTop: 1 },
});

export default function ContainerDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const session = useAppSession();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    isVerifiedAdmin(session.email ?? "").then(setIsAdmin);
  }, [session.email]);

  const item = useMemo(() => {
    if (!params?.item || typeof params.item !== "string") return null;
    try {
      return JSON.parse(params.item) as ContainerItem;
    } catch {
      return null;
    }
  }, [params]);
  const handleInquiry = async () => {
  const phoneNumber = "919876543210"; // Replace with your number

  const message =
    `New inquiry received!\n` +
    `Product: ${item?.title || "Shipment"}\n` +
    `Rate: ${item ? displayRate(item) : "N/A"}`;

  const url =
    `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  try {
    await Linking.openURL(url);

    setTimeout(() => {
      router.push("/inquiry-box");
    }, 1000);
  } catch (error) {
    console.log("Could not open WhatsApp:", error);
  }
};

  useEffect(() => {
    if (!session.ready) return;
    if (session.isLoggedIn) return;

    if (params?.item && typeof params.item === "string") {
      session.openAdInsights(params.item);
      return;
    }

    session.setIntendedRole("buyer");
    router.replace("/(tabs)/account");
  }, [session.ready, session.isLoggedIn, params?.item, router, session]);

  if (!session.ready || !session.isLoggedIn) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <VegLoader context="containers" label="Redirecting to login…" />
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <EmptyState
          variant="error"
          title="Listing not found"
          subtitle="This shipment may have sailed away or been removed."
          actionLabel="Go Back"
          onAction={() => safeBack(router, "/(tabs)/containers")}
        />
      </SafeAreaView>
    );
  }

  const origin = item.route_from || "—";
  const img = produceImage(item.title, item.category, item.image_url);
  const wishlisted = session.isWishlisted(item.id);
  const accent = categoryAccent(item.category);
  const isNew = isNewListing(item.created_at);
  const arrivalDate = formatArrived(item.availability_date);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Top row ── */}
        <View style={styles.topRow}>
          <Pressable style={styles.backBtn} onPress={() => safeBack(router, "/(tabs)/containers")}>
            <Ionicons name="arrow-back" size={20} color={BRAND.text} />
            <Text style={styles.backText}>View Ads</Text>
          </Pressable>

          <AnimatedPressable
            style={styles.heartBtn}
            onPress={() =>
              session.toggleWishlist({
                id: item.id,
                title: item.title || "Fresh Produce",
                origin: item.route_from,
                location: item.market_location || item.route_to,
                priceLabel: displayRate(item),
                imageUrl: item.image_url,
                containerLabel: displayContainer(item),
              })
            }
            haptic
          >
            <Ionicons
              name={wishlisted ? "star" : "star-outline"}
              size={20}
              color={wishlisted ? "#E11D48" : BRAND.primary}
            />
          </AnimatedPressable>
        </View>

        {/* ── Hero image ── */}
        <View style={styles.heroWrap}>
          <Image source={{ uri: img }} style={styles.image} resizeMode="cover" />

          {/* Overlay badges */}
          <View style={styles.badgeRow}>
            {isNew && (
              <View style={[styles.badge, { backgroundColor: BRAND.primary }]}>
                <Ionicons name="flash" size={10} color="#FFFFFF" />
                <Text style={styles.badgeText}>New Listing</Text>
              </View>
            )}
          </View>
        </View>


        {/* ── Title ── */}
        <Text style={styles.title}>{item.title || "Container Listing"}</Text>
        <Text style={styles.company}>
          {isAdmin
            ? item.company_name || "Verified Exporter"
            : "Verified Exporter"}
        </Text>

        {/* ── Details Panel ── */}
        <View style={styles.detailPanel}>
          <Text style={styles.panelHeading}>Shipment Details</Text>
          {arrivalDate ? (
            <MetaRow
              icon="calendar-outline"
              label="Availability Date"
              value={arrivalDate || "Not specified"}
              accentColor={arrivalDate ? BRAND.accent : undefined}
            />
          ) : null}
      
          {displayPackagingType(item) ? (
            <MetaRow
              icon="layers-outline"
              label="Packaging Type"
              value={displayPackagingType(item)!}
            />
          ) : null}
          {displayPackageCount(item) ? (
            <MetaRow
              icon="albums-outline"
              label="Package Count"
              value={displayPackageCount(item)!}
            />
          ) : null}
          {displayWeightPerPackage(item) ? (
            <MetaRow
              icon="scale-outline"
              label="Weight Per Package"
              value={displayWeightPerPackage(item)!}
            />
          ) : null}
          {displayTotalWeight(item) ? (
            <MetaRow
              icon="calculator-outline"
              label="Total Weight"
              value={displayTotalWeight(item)!}
            />
          ) : null}
          <MetaRow
            icon="pricetag-outline"
            label="Rate Type"
            value={
              item.rate_type === "per_kg"
                ? "Per Kg"
                : item.rate_type === "per_piece"
                  ? "Per Piece"
                  : "Per Container"
            }
          />
          <MetaRow
            icon="cash-outline"
            label="Rate"
            value={`${displayRate(item)} ${displayRateUnit(item)}`}
            accentColor={BRAND.primary}
          />
        </View>

        {/* ── Inquiry CTA ── */}
        <AnimatedPressable
          style={styles.inquiryBtn}
          onPress={handleInquiry}
          haptic
        >
          <Ionicons name="mail-outline" size={18} color="#FFFFFF" />
          <Text style={styles.inquiryText}>Send Inquiry</Text>
        </AnimatedPressable>

        {/* ── Pre-book button for upcoming shipments ── */}
        {item.availability_date && new Date(item.availability_date) > new Date() ? (
          <AnimatedPressable
            style={styles.prebookBtn}
            onPress={() => session.togglePreBook(item.id, item.title || "This shipment", item.availability_date)}
            haptic
          >
            <Ionicons name="bookmark-outline" size={18} color={BRAND.primary} />
            <Text style={styles.prebookText}>
              {session.isPreBooked(item.id) ? "Pre-Booked ✓" : "Pre-Book Alert"}
            </Text>
          </AnimatedPressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.pageBg },
  content: { paddingBottom: 36 },

  // Navigation row
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.borderLight,
  },
  backText: { fontSize: 14, fontWeight: "700", color: BRAND.text },
  heartBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BRAND.borderLight,
    shadowColor: BRAND.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  // Hero image
  heroWrap: { marginHorizontal: 16, borderRadius: 22, overflow: "hidden", marginBottom: 16 },
  image: {
    width: "100%",
    height: 228,
    backgroundColor: BRAND.primaryLight,
  },
  badgeRow: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    gap: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },

  // Price highlight section
  priceHighlight: {
    marginHorizontal: 16,
    borderRadius: 20,
    backgroundColor: BRAND.primary,
    flexDirection: "row",
    marginBottom: 18,
    overflow: "hidden",
    shadowColor: BRAND.primary,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  priceBlock: {
    flex: 1,
    padding: 18,
  },
  arrivalBlock: {
    backgroundColor: "#065F24",
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "rgba(255,255,255,0.75)",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  priceValue: { fontSize: 24, fontWeight: "900", color: "#FFFFFF", marginTop: 6 },
  priceUnit: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.75)", marginTop: 2 },

  // Title
  title: {
    marginHorizontal: 16,
    fontSize: 26,
    fontWeight: "900",
    color: BRAND.text,
    letterSpacing: -0.5,
  },
  company: {
    marginHorizontal: 16,
    marginTop: 4,
    fontSize: 14,
    fontWeight: "600",
    color: BRAND.muted,
    marginBottom: 20,
  },

  // Details panel
  detailPanel: {
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: BRAND.borderLight,
    marginBottom: 16,
    shadowColor: BRAND.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  panelHeading: {
    fontSize: 14,
    fontWeight: "900",
    color: BRAND.muted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },

  // Buttons
  inquiryBtn: {
    marginHorizontal: 16,
    backgroundColor: BRAND.primary,
    borderRadius: 18,
    minHeight: 56,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    shadowColor: BRAND.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  inquiryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  prebookBtn: {
    marginHorizontal: 16,
    backgroundColor: BRAND.primaryLight,
    borderRadius: 18,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1.5,
    borderColor: BRAND.primary,
    marginBottom: 6,
  },
  prebookText: { color: BRAND.primary, fontSize: 15, fontWeight: "800" },
});