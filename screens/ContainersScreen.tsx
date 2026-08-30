import EmptyState from "@/components/EmptyState";
import ProduceImage from "@/components/ProduceImage";
import VegLoader from "@/components/VegLoader";
import { useAppSession } from "@/lib/appSession";
import { safeBack } from "@/lib/nav";
import {
  GREEN,
  HD_IMAGES,
  PAGE_BG,
  containerLabel,
  countryFlag,
  formatArrived,
  formatPrice,
  isNewListing,
  isUpcoming,
  matchCategory
} from "@/lib/produceUi";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
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
  is_active?: boolean | null;
};

const CHIPS = ["All", "Fruits", "Vegetables", "Spices", "Nuts", "Herbs"];
const CHIP_GREEN = GREEN;

const FALLBACK_LIVE: ContainerItem[] = [
  {
    id: "live-grapes",
    title: "Fresh Green Grapes",
    packaging: "40ft",
    qty: 1,
    quantity_unit: "container",
    price: 12500,
    currency: "AED",
    route_from: "Peru",
    route_to: "Dubai",
    availability_date: "2026-08-14",
    image_url: HD_IMAGES.grapes,
    company_name: null,
    market_location: "Dubai",
    container_type: "40ft Container",
    category: "fruits",
    created_at: new Date().toISOString(),
  },
  {
    id: "live-oranges",
    title: "Fresh Oranges",
    packaging: "40ft",
    qty: 1,
    quantity_unit: "container",
    price: 9800,
    currency: "AED",
    route_from: "South Africa",
    route_to: "Jebel Ali",
    availability_date: "2026-08-12",
    image_url: HD_IMAGES.oranges,
    company_name: null,
    market_location: "Jebel Ali",
    container_type: "40ft Container",
    category: "fruits",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
  },
  {
    id: "live-apples",
    title: "Fresh Red Apples",
    packaging: "40ft",
    qty: 1,
    quantity_unit: "container",
    price: 11200,
    currency: "AED",
    route_from: "Poland",
    route_to: "Dubai",
    availability_date: "2026-08-10",
    image_url: HD_IMAGES.apples,
    company_name: null,
    market_location: "Dubai",
    container_type: "40ft Container",
    category: "fruits",
  },
];

const FALLBACK_UPCOMING: ContainerItem[] = [
  {
    id: "up-tomato",
    title: "Local Tomatoes",
    packaging: "40ft",
    qty: 1,
    quantity_unit: "container",
    price: 8900,
    currency: "AED",
    route_from: "India",
    route_to: "Dubai",
    availability_date: "2026-08-28",
    image_url: HD_IMAGES.tomatoes,
    company_name: null,
    market_location: "Al Aweer",
    container_type: "40ft Container",
    category: "vegetables",
  },
  {
    id: "up-spices",
    title: "Premium Spices Mix",
    packaging: "20ft",
    qty: 1,
    quantity_unit: "container",
    price: 15600,
    currency: "AED",
    route_from: "India",
    route_to: "Jebel Ali",
    availability_date: "2026-09-02",
    image_url: HD_IMAGES.spices,
    company_name: null,
    market_location: "Jebel Ali",
    container_type: "20ft Container",
    category: "spices",
  },
];

function displayRate(item: ContainerItem) {
  const value = item.rate ?? item.price;
  return formatPrice(item.currency || "AED", value);
}

function displayRateUnit(item: ContainerItem) {
  if (item.rate_type === "per_kg") return "kg";
  if (item.rate_type === "per_piece") return "piece";
  return "container";
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

export default function ContainersScreen() {
  const router = useRouter();
  const session = useAppSession();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chip, setChip] = useState("All");
  const [items, setItems] = useState<ContainerItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadContainers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from("containers")
      .select(
        "id,title,packaging,packaging_type,package_count,weight_per_package_kg,rate_type,rate,qty,quantity_unit,price,currency,route_from,route_to,availability_date,image_url,company_name,market_location,container_type,category,created_at,is_active"
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setItems([...FALLBACK_LIVE, ...FALLBACK_UPCOMING]);
    } else {
      const rows = (data as ContainerItem[]) ?? [];
      setItems(rows.length ? rows : [...FALLBACK_LIVE, ...FALLBACK_UPCOMING]);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadContainers();
    }, [loadContainers])
  );

  const liveItems = useMemo(
    () =>
      items.filter(
        (item) => matchCategory(item.category || item.title, chip) && !isUpcoming(item.availability_date)
      ),
    [items, chip]
  );

  const upcomingItems = useMemo(
    () =>
      items.filter(
        (item) => matchCategory(item.category || item.title, chip) && isUpcoming(item.availability_date)
      ),
    [items, chip]
  );

  useFocusEffect(
    useCallback(() => {
      if (!session.isLoggedIn) return;
      liveItems.forEach((item) => {
        if (session.isPreBooked(item.id) && !isUpcoming(item.availability_date) && !session.notifiedIds.includes(item.id)) {
          session.markNotified(item.id);
          void import("@/lib/pushNotifications").then(({ notifyShipmentNowLive }) => {
            void notifyShipmentNowLive(item.id, item.title || "A pre-booked shipment");
          });
        }
      });
    }, [liveItems, session])
  );

  function wishPayload(item: ContainerItem) {
    return {
      id: item.id,
      title: item.title || "Fresh Produce",
      origin: item.route_from,
      location: item.market_location || item.route_to,
      priceLabel: displayRate(item),
      imageUrl: item.image_url,
      containerLabel: displayContainer(item),
    };
  }

  function liveBadge(item: ContainerItem, index: number) {
    if (isNewListing(item.created_at) || index === 0) return "New";
    if (index === 1) return "Featured";
    return null;
  }

  function renderHeart(item: ContainerItem) {
    if (!session.isLoggedIn) return null;
    const wishlisted = session.isWishlisted(item.id);
    return (
      <Pressable
        hitSlop={8}
        style={styles.heartBtn}
        onPress={() => session.toggleWishlist(wishPayload(item))}
      >
        <Ionicons
          name={wishlisted ? "heart" : "star-outline"}
          size={18}
          color={wishlisted ? "#E11D48" : "#111111"}
        />
      </Pressable>
    );
  }

  function renderLiveCard(item: ContainerItem, index: number) {
    const origin = item.route_from || "Peru";
    const badge = liveBadge(item, index);
    const arrived = formatArrived(item.availability_date);

    return (
      <Pressable style={styles.card} onPress={() => session.openAdInsights(JSON.stringify(item))}>
        {session.isLoggedIn ? (
          <View style={styles.cardHeart}>{renderHeart(item)}</View>
        ) : null}

        <View style={styles.imageWrap}>
          <ProduceImage
            title={item.title}
            category={item.category}
            imageUrl={item.image_url}
            style={styles.image}
          />
          {badge ? (
            <View style={styles.imageBadge}>
              <Text style={styles.imageBadgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.body}>
          <Text style={styles.product} numberOfLines={1}>
            {item.title || "Container Listing"}
          </Text>
          <Text style={styles.meta}>
            {countryFlag(origin)} {origin}
          </Text>
          <Text style={styles.meta}>Container: {displayContainer(item)}</Text>
          {displayPackagingType(item) ? (
            <Text style={styles.meta}>Packaging: {displayPackagingType(item)}</Text>
          ) : null}
          {displayPackageCount(item) ? (
            <Text style={styles.meta}>Packages: {displayPackageCount(item)}</Text>
          ) : null}
          {displayWeightPerPackage(item) ? (
            <Text style={styles.meta}>Weight/package: {displayWeightPerPackage(item)}</Text>
          ) : null}
          <Text style={styles.meta}>Available: {item.market_location || item.route_to || "Dubai"}</Text>
          <View style={styles.bottomRow}>
            <Text style={styles.price}>{displayRate(item)} / {displayRateUnit(item)}</Text>
            {arrived ? (
              <View style={styles.arrivedPill}>
                <Text style={styles.arrivedText}>Arrived: {arrived}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  }

  function renderUpcomingCard(item: ContainerItem) {
    const origin = item.route_from || "India";
    const booked = session.isLoggedIn && session.isPreBooked(item.id);

    return (
      <Pressable style={styles.card} onPress={() => session.openAdInsights(JSON.stringify(item))}>
        {session.isLoggedIn ? (
          <View style={styles.cardHeart}>{renderHeart(item)}</View>
        ) : null}

        <View style={styles.upcomingCorner}>
          <View style={styles.soonBadge}>
            <Text style={styles.soonText}>Arriving Soon</Text>
          </View>
        </View>
        <View style={styles.imageWrap}>
          <ProduceImage
            title={item.title}
            category={item.category}
            imageUrl={item.image_url}
            style={styles.image}
          />
        </View>
        <View style={[styles.body, styles.upcomingBody]}>
          <Text style={styles.product} numberOfLines={1}>
            {item.title || "Upcoming shipment"}
          </Text>
          <Text style={styles.meta}>
            {countryFlag(origin)} {origin}
          </Text>
          <Text style={styles.meta}>Container: {displayContainer(item)}</Text>
          {displayPackagingType(item) ? (
            <Text style={styles.meta}>Packaging: {displayPackagingType(item)}</Text>
          ) : null}
          {displayPackageCount(item) ? (
            <Text style={styles.meta}>Packages: {displayPackageCount(item)}</Text>
          ) : null}
          {displayWeightPerPackage(item) ? (
            <Text style={styles.meta}>Weight/package: {displayWeightPerPackage(item)}</Text>
          ) : null}
          <Text style={styles.meta}>Available: {item.market_location || item.route_to || "Dubai"}</Text>
          <Text style={styles.price}>{displayRate(item)} / {displayRateUnit(item)}</Text>
          <Pressable
            style={[styles.prebookBtn, booked && styles.prebookBtnOn]}
            onPress={() => {
              if (!session.isLoggedIn) {
                session.setIntendedRole("buyer");
                router.push("/(tabs)/account" as Href);
                return;
              }
              session.togglePreBook(
                item.id,
                item.title || "This shipment",
                item.availability_date
              );
            }}
          >
            <Text style={[styles.prebookText, booked && styles.prebookTextOn]}>
              {booked ? "Pre-Booked" : "Pre-Booking"}
            </Text>
          </Pressable>
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => safeBack(router, "/(tabs)")} style={styles.iconBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>View Ads</Text>
        <View style={styles.headerRight}>
          <Pressable onPress={() => router.push("/search" as Href)} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="search" size={20} color="#111827" />
          </Pressable>
          {session.isLoggedIn ? (
            <Pressable onPress={() => session.setWishlistOpen(true)} style={styles.iconBtn} hitSlop={8}>
              <Ionicons name="star-outline" size={20} color={GREEN} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.chipsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {CHIPS.map((name) => {
            const on = chip === name;
            return (
              <Pressable key={name} style={[styles.chip, on && styles.chipOn]} onPress={() => setChip(name)}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <VegLoader context="ads" label="Loading live ads…" />
      ) : error && items.length === 0 ? (
        <EmptyState
          variant="error"
          title="Couldn't load shipments"
          subtitle={error}
          actionLabel="Try Again"
          onAction={() => loadContainers()}
        />
      ) : (
        <FlatList
          style={styles.flex}
          data={liveItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => renderLiveCard(item, index)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadContainers(true)} />
          }
          ListEmptyComponent={
            <EmptyState
              title="No live ads yet"
              subtitle="Check back soon — fresh shipments arrive daily."
              icon="boat-outline"
            />
          }
          ListFooterComponent={
            upcomingItems.length ? (
              <View style={styles.upcomingWrap}>
                <Text style={styles.sectionTitle}>Upcoming Shipments</Text>
                {upcomingItems.map((item) => (
                  <View key={item.id}>{renderUpcomingCard(item)}</View>
                ))}
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PAGE_BG },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800", color: "#111827" },
  headerRight: { flexDirection: "row", minWidth: 80, justifyContent: "flex-end" },
  chipsWrap: { flexGrow: 0 },
  chips: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  chip: {
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipOn: { backgroundColor: CHIP_GREEN },
  chipText: { fontWeight: "800", color: "#111827" },
  chipTextOn: { color: "#FFFFFF" },
  list: { paddingHorizontal: 16, paddingBottom: 28 },
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF2F0",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    gap: 12,
    overflow: "visible",
    position: "relative",
  },
  imageWrap: {
    position: "relative",
    width: 108,
    height: 108,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#E8EEE9",
  },
  image: { width: 108, height: 108, borderRadius: 14 },
  cardHeart: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
  },
  heartBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageBadge: {
    position: "absolute",
    left: 6,
    bottom: 6,
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  imageBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  body: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    paddingRight: 34,
  },
  upcomingBody: { paddingTop: 28, paddingRight: 4 },
  product: { fontSize: 15, fontWeight: "800", color: "#111827" },
  meta: { marginTop: 4, fontSize: 12, color: "#6B7280", fontWeight: "600" },
  bottomRow: { marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  price: { marginTop: 8, fontSize: 14, fontWeight: "800", color: "#111827", flex: 1 },
  arrivedPill: {
    backgroundColor: "#E8F5EC",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  arrivedText: { color: GREEN, fontSize: 11, fontWeight: "800" },
  upcomingWrap: { marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111827", marginBottom: 12 },
  upcomingCorner: {
    position: "absolute",
    top: 10,
    right: 48,
    zIndex: 4,
  },
  soonBadge: {
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  soonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  prebookBtn: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: GREEN,
    paddingVertical: 10,
    alignItems: "center",
  },
  prebookBtnOn: { backgroundColor: "#E8F5EC" },
  prebookText: { color: "#FFFFFF", fontWeight: "800" },
  prebookTextOn: { color: GREEN },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  loadingText: { marginTop: 8, color: "#6B7280", fontWeight: "600" },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  emptyText: { marginTop: 8, color: "#6B7280", textAlign: "center" },
  retryBtn: {
    marginTop: 16,
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: { color: "#FFFFFF", fontWeight: "800" },
});