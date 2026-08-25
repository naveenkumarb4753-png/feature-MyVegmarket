import AnimatedPressable from "@/components/AnimatedPressable";
import GlobalSearchBar from "@/components/GlobalSearchBar";
import ProduceImage from "@/components/ProduceImage";
import { BRAND } from "@/constants/colors";
import { useAppSession } from "@/lib/appSession";
import {
  GREEN,
  HD_IMAGES,
  PAGE_BG,
  containerLabel,
  countryFlag,
  formatKgRange,
  formatPrice,
  isNewListing,
} from "@/lib/produceUi";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_W } = Dimensions.get("window");

type PriceCard = {
  id: string;
  name: string;
  image_url: string | null;
  min_price: number | null;
  max_price: number | null;
  latest_updated_at: string | null;
  changePct: number;
};

type AdCard = {
  id: string;
  title: string | null;
  route_from: string | null;
  market_location: string | null;
  route_to: string | null;
  price: number | null;
  currency: string | null;
  container_type: string | null;
  qty: number | null;
  image_url: string | null;
  category: string | null;
  created_at?: string | null;
};

// ─── Search Placeholder Loop ────────────────────────────────────────────────
const SEARCH_TEXTS = ["fruits", "vegetables", "shipments"];
let globalSearchIndex = 0;

// ─── Hero Banners ────────────────────────────────────────────────────────────
const HERO_BANNERS = [
  {
    key: "b1",
    title: "Fresh Produce\nShipments",
    sub: "Connect Buyers & Importers",
    cta: "Post Your Shipment",
    image: HD_IMAGES.hero,
    gradient: ["#0A8A3A", "#064F22"] as [string, string],
    action: "postAd" as const,
  },
  {
    key: "b2",
    title: "Al Aweer\nMarket Prices",
    sub: "Live daily rates from Dubai's wholesale hub",
    cta: "View Today's Prices",
    image: HD_IMAGES.tomatoes,
    gradient: ["#1D4ED8", "#1E40AF"] as [string, string],
    action: "prices" as const,
  },
  {
    key: "b3",
    title: "Browse Fresh\nFruit Shipments",
    sub: "New containers arriving weekly",
    cta: "Browse Ads",
    image: HD_IMAGES.grapes,
    gradient: ["#D97706", "#B45309"] as [string, string],
    action: "containers" as const,
  },
];

function HeroBannerCarousel({
  onPostAd,
  onPrices,
  onContainers,
}: {
  onPostAd: () => void;
  onPrices: () => void;
  onContainers: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bannerWidth = SCREEN_W - 32;

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % HERO_BANNERS.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleAction = (action: "postAd" | "prices" | "containers") => {
    if (action === "postAd") onPostAd();
    else if (action === "prices") onPrices();
    else onContainers();
  };

  const renderBanner = ({
    item: banner,
  }: {
    item: (typeof HERO_BANNERS)[0];
  }) => (
    <View
      style={[
        heroStyles.card,
        { backgroundColor: banner.gradient[0], width: bannerWidth },
      ]}
    >
      <View style={heroStyles.cardCopy}>
        <View style={heroStyles.livePill}>
          <View style={heroStyles.liveDot} />
          <Text style={heroStyles.liveText}>LIVE</Text>
        </View>
        <Text style={heroStyles.cardTitle}>{banner.title}</Text>
        <Text style={heroStyles.cardSub}>{banner.sub}</Text>
        <AnimatedPressable
          style={heroStyles.cardCta}
          onPress={() => handleAction(banner.action)}
        >
          <Text style={heroStyles.cardCtaText}>{banner.cta}</Text>
          <Ionicons name="arrow-forward" size={14} color={banner.gradient[0]} />
        </AnimatedPressable>
      </View>
      <ProduceImage
        title={banner.title}
        category="vegetables"
        imageUrl={banner.image}
        style={heroStyles.cardImage}
      />
    </View>
  );

  return (
    <View style={heroStyles.wrap}>
      <FlatList
        ref={flatListRef}
        data={HERO_BANNERS}
        keyExtractor={(item) => item.key}
        renderItem={renderBanner}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={bannerWidth}
        snapToAlignment="center"
        onMomentumScrollEnd={(e: any) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / bannerWidth);
          if (idx >= 0 && idx < HERO_BANNERS.length) {
            setActiveIndex(idx);
          }
        }}
        getItemLayout={(_: any, index: number) => ({
          length: bannerWidth,
          offset: bannerWidth * index,
          index,
        })}
        style={{ width: bannerWidth }}
      />

      {/* Dot indicators */}
      <View style={heroStyles.dots}>
        {HERO_BANNERS.map((_, i) => (
          <Pressable
            key={i}
            onPress={() => {
              flatListRef.current?.scrollToIndex({ index: i, animated: true });
              setActiveIndex(i);
            }}
          >
            <View
              style={[
                heroStyles.dot,
                i === activeIndex && heroStyles.dotActive,
              ]}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const heroStyles = StyleSheet.create({
  wrap: { marginBottom: 20 },
  card: {
    width: SCREEN_W - 32,
    borderRadius: 22,
    overflow: "hidden",
    minHeight: 178,
    flexDirection: "row",
    shadowColor: BRAND.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardCopy: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    gap: 8,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  liveText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 29,
    letterSpacing: -0.5,
  },
  cardSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
    maxWidth: 180,
  },
  cardCta: {
    marginTop: 2,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cardCtaText: {
    fontSize: 12,
    fontWeight: "900",
    color: BRAND.primaryDark,
  },
  cardImage: {
    width: 124,
    height: "100%",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND.border,
  },
  dotActive: {
    width: 20,
    backgroundColor: BRAND.primary,
  },
});

// ─── Category Row ─────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: "Fruits", image: HD_IMAGES.fruits, color: "#EA580C" },
  { key: "Vegetables", image: HD_IMAGES.vegetables, color: "#059669" },
  { key: "Spices", image: HD_IMAGES.spices, color: "#DC2626" },
  { key: "More", image: null, color: BRAND.primary },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const session = useAppSession();
  const [prices, setPrices] = useState<PriceCard[]>([]);
  const [ads, setAds] = useState<AdCard[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState(SEARCH_TEXTS[globalSearchIndex]);
  const searchFade = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animated search placeholder loop
  useEffect(() => {
    timerRef.current = setInterval(() => {
      Animated.timing(searchFade, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        globalSearchIndex = (globalSearchIndex + 1) % SEARCH_TEXTS.length;
        setSearchText(SEARCH_TEXTS[globalSearchIndex]);
        Animated.timing(searchFade, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }).start();
      });
    }, 2800);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [searchFade]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { data: products } = await supabase
        .from("products")
        .select(
          "id,name,image_url,market_price_aed,myveg_price_aed,updated_at,active",
        )
        .eq("active", true)
        .order("updated_at", { ascending: false })
        .limit(6);

      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { data: updates } = await supabase
        .from("price_updates")
        .select("published_product_id,price,created_at")
        .eq("status", "approved")
        .gte("created_at", start.toISOString())
        .order("created_at", { ascending: true });

      const grouped = new Map<
        string,
        { min: number; max: number; at: string | null }
      >();
      (updates || []).forEach((row: any) => {
        if (!row.published_product_id || row.price == null) return;
        const cur = grouped.get(row.published_product_id);
        if (!cur) {
          grouped.set(row.published_product_id, {
            min: row.price,
            max: row.price,
            at: row.created_at,
          });
        } else {
          grouped.set(row.published_product_id, {
            min: Math.min(cur.min, row.price),
            max: Math.max(cur.max, row.price),
            at: row.created_at || cur.at,
          });
        }
      });

      setPrices(
        (products || []).map((p: any) => {
          const stats = grouped.get(p.id);
          const min = stats?.min ?? p.myveg_price_aed ?? p.market_price_aed;
          const max = stats?.max ?? p.market_price_aed ?? p.myveg_price_aed;
          let changePct = 0;
          if (min && max && min > 0)
            changePct = Math.round(((max - min) / min) * 100);
          return {
            id: p.id,
            name: p.name,
            image_url: p.image_url,
            min_price: min,
            max_price: max,
            latest_updated_at: stats?.at ?? p.updated_at,
            changePct,
          };
        }),
      );

      const { data: adsData } = await supabase
        .from("containers")
        .select(
          "id,title,route_from,market_location,route_to,price,currency,container_type,qty,image_url,category,created_at",
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(4);

      setAds((adsData as AdCard[]) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      session.refreshSession();
    }, [load, session.refreshSession]),
  );

  function stopSearchLoop() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function formatUpdated(value?: string | null) {
    if (!value) return "Updated recently";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "Updated recently";
    return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
  }

  return (
    <SafeAreaView style={st.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={st.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={GREEN}
          />
        }
      >
        {/* ── Header ── */}
        <View style={st.header}>
          <View style={st.brandRow}>
            <View style={st.logoCircle}>
              <Ionicons name="leaf" size={16} color={GREEN} />
            </View>
            <Text style={st.brand}>MyVegmarket</Text>
          </View>
          <View style={st.headerRight}>
            {session.isLoggedIn ? (
              <AnimatedPressable
                style={st.iconBtn}
                onPress={() => session.setWishlistOpen(true)}
                haptic
              >
                <Ionicons name="heart-outline" size={22} color={GREEN} />
                {session.wishlist.length > 0 ? (
                  <View style={st.heartBadge}>
                    <Text style={st.heartBadgeText}>
                      {session.wishlist.length}
                    </Text>
                  </View>
                ) : null}
              </AnimatedPressable>
            ) : null}
            <AnimatedPressable
              style={st.iconBtn}
              onPress={() => router.push("/inquiry-box" as Href)}
              haptic
            >
              <Ionicons
                name="notifications-outline"
                size={22}
                color={BRAND.text}
              />
              <View style={st.notifDot} />
            </AnimatedPressable>
          </View>
        </View>

        {/* ── Global Search Bar ── */}
        <View style={{ marginBottom: 16 }}>
          <GlobalSearchBar />
        </View>

        {/* ── Hero Banner Carousel ── */}
        <HeroBannerCarousel
          onPostAd={session.goPostAd}
          onPrices={() => router.push("/(tabs)/prices" as Href)}
          onContainers={() => router.push("/(tabs)/containers" as Href)}
        />

        {/* ── Categories ── */}
        <View style={st.sectionHead}>
          <Text style={st.sectionTitle}>View by Category</Text>
          <Pressable onPress={() => router.push("/categories" as Href)}>
            <Text style={st.viewAll}>View all →</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={st.catRow}
        >
          {CATEGORIES.map((cat) => (
            <AnimatedPressable
              key={cat.key}
              style={st.catCard}
              onPress={() =>
                router.push(`/search?q=${encodeURIComponent(cat.key)}` as Href)
              }
              haptic
            >
              <View style={st.catIcon}>
                <ProduceImage
                  title={cat.key}
                  category={cat.key}
                  imageUrl={cat.image}
                  style={st.catImage}
                />
              </View>
              <Text
                style={[st.catLabel, { color: cat.color }]}
                numberOfLines={1}
              >
                {cat.key}
              </Text>
            </AnimatedPressable>
          ))}
        </ScrollView>

        {/* ── Al Aweer Prices ── */}
        <View style={st.sectionHead}>
          <Text style={st.sectionTitle}>Al Aweer Prices</Text>
          <Pressable onPress={() => router.push("/(tabs)/prices" as Href)}>
            <Text style={st.viewAll}>View All →</Text>
          </Pressable>
        </View>

        {(prices.length ? prices : FALLBACK_PRICES).slice(0, 3).map((item) => {
          const up = item.changePct >= 0;
          return (
            <AnimatedPressable
              key={item.id}
              style={st.priceCard}
              onPress={() => session.openPriceInsights(item.id)}
              haptic
            >
              <ProduceImage
                title={item.name}
                category="vegetables"
                imageUrl={item.image_url}
                style={st.priceImage}
              />
              <View style={st.priceBody}>
                <Text style={st.cardTitle} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={st.priceRange}>
                  {formatKgRange(item.min_price, item.max_price)}
                </Text>
                <Text style={st.priceMeta}>
                  Updated: {formatUpdated(item.latest_updated_at)}
                </Text>
              </View>
              <View style={[st.trendBadge, !up && st.trendBadgeDown]}>
                <Ionicons
                  name={up ? "trending-up" : "trending-down"}
                  size={12}
                  color="#FFFFFF"
                />
                <Text style={st.trendText}>
                  {item.changePct > 0 ? "+" : ""}
                  {item.changePct}%
                </Text>
              </View>
            </AnimatedPressable>
          );
        })}

        {/* ── Featured Shipments ── */}
        <View style={[st.sectionHead, { marginTop: 10 }]}>
          <Text style={st.sectionTitle}>Featured Shipments</Text>
          <Pressable onPress={() => router.push("/(tabs)/containers" as Href)}>
            <Text style={st.viewAll}>View All →</Text>
          </Pressable>
        </View>

        {(ads.length ? ads : FALLBACK_ADS).slice(0, 4).map((item, index) => {
          const origin = item.route_from || "Peru";
          const wishlisted =
            session.isLoggedIn && session.isWishlisted(item.id);
          const showNew = item.created_at
            ? isNewListing(item.created_at)
            : false;
          const showFeatured = index === 0 || (!showNew && index < 2);
          return (
            <AnimatedPressable
              key={item.id}
              style={st.adCard}
              onPress={() => session.openAdInsights(JSON.stringify(item))}
              haptic
            >
              <View style={st.adImageWrap}>
                <ProduceImage
                  title={item.title}
                  category={item.category}
                  imageUrl={item.image_url}
                  style={st.adImage}
                />
                <View style={st.adBadges}>
                  {showFeatured && (
                    <View style={st.featuredBadge}>
                      <Text style={st.badgeOnImageText}>Featured</Text>
                    </View>
                  )}
                  {showNew && (
                    <View style={st.newBadge}>
                      <Text style={st.badgeOnImageText}>New</Text>
                    </View>
                  )}
                </View>
                {session.isLoggedIn ? (
                  <AnimatedPressable
                    style={st.heartOnImage}
                    hitSlop={8}
                    onPress={() =>
                      session.toggleWishlist({
                        id: item.id,
                        title: item.title || "Fresh Produce",
                        origin,
                        location: item.market_location || item.route_to,
                        priceLabel: formatPrice(item.currency, item.price),
                        imageUrl: item.image_url,
                        containerLabel: containerLabel(
                          item.container_type,
                          item.qty,
                        ),
                      })
                    }
                    haptic
                  >
                    <Ionicons
                      name={wishlisted ? "heart" : "heart-outline"}
                      size={15}
                      color={wishlisted ? "#E11D48" : GREEN}
                    />
                  </AnimatedPressable>
                ) : null}
              </View>
              <View style={st.adBody}>
                <Text style={st.cardTitle} numberOfLines={1}>
                  {item.title || "Fresh Produce"}
                </Text>
                <View style={st.metaRow}>
                  <Text style={st.meta}>
                    {countryFlag(origin)} {origin}
                  </Text>
                </View>
                <View style={st.metaRow}>
                  <Ionicons name="cube-outline" size={13} color={BRAND.muted} />
                  <Text style={st.meta}>
                    {containerLabel(item.container_type, item.qty)}
                  </Text>
                </View>
                <View style={st.metaRow}>
                  <Ionicons
                    name="location-outline"
                    size={13}
                    color={BRAND.muted}
                  />
                  <Text style={st.meta}>
                    {item.market_location || item.route_to || "Dubai"}
                  </Text>
                </View>
                <Text style={st.adPrice}>
                  {formatPrice(item.currency, item.price)} / Container
                </Text>
              </View>
            </AnimatedPressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Fallback Data ────────────────────────────────────────────────────────────
const FALLBACK_PRICES: PriceCard[] = [
  {
    id: "tomato",
    name: "Tomato (Local)",
    image_url: HD_IMAGES.tomatoes,
    min_price: 2.5,
    max_price: 3.2,
    latest_updated_at: new Date().toISOString(),
    changePct: 8,
  },
  {
    id: "grapes",
    name: "Green Grapes",
    image_url: HD_IMAGES.grapes,
    min_price: 5.8,
    max_price: 6.9,
    latest_updated_at: new Date().toISOString(),
    changePct: -3,
  },
  {
    id: "apples",
    name: "Fresh Apples",
    image_url: HD_IMAGES.apples,
    min_price: 4.2,
    max_price: 5.0,
    latest_updated_at: new Date().toISOString(),
    changePct: 2,
  },
];

const FALLBACK_ADS: AdCard[] = [
  {
    id: "grapes",
    title: "Fresh Green Grapes",
    route_from: "Peru",
    market_location: "Dubai",
    route_to: "Dubai",
    price: 12500,
    currency: "AED",
    container_type: "40ft Container",
    qty: 1,
    image_url: HD_IMAGES.grapes,
    category: "fruits",
    created_at: new Date().toISOString(),
  },
  {
    id: "oranges",
    title: "Fresh Oranges",
    route_from: "South Africa",
    market_location: "Dubai",
    route_to: "Dubai",
    price: 9800,
    currency: "AED",
    container_type: "40ft Container",
    qty: 1,
    image_url: HD_IMAGES.oranges,
    category: "fruits",
    created_at: new Date().toISOString(),
  },
  {
    id: "apples",
    title: "Fresh Red Apples",
    route_from: "Poland",
    market_location: "Dubai",
    route_to: "Dubai",
    price: 11200,
    currency: "AED",
    container_type: "40ft Container",
    qty: 1,
    image_url: HD_IMAGES.apples,
    category: "fruits",
    created_at: new Date().toISOString(),
  },
];

// ─── Styles ───────────────────────────────────────────────────────────────────
const CARD_SHADOW = {
  shadowColor: BRAND.shadow,
  shadowOpacity: 0.07,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PAGE_BG },
  content: { padding: 16, paddingBottom: 36 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { fontSize: 21, fontWeight: "900", color: GREEN, letterSpacing: -0.5 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.borderLight,
  },
  heartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#E11D48",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  heartBadgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "800" },
  notifDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.accent,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },

  // Search
  searchBox: {
    height: 50,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1.5,
    borderColor: BRAND.borderLight,
    marginBottom: 20,
    ...CARD_SHADOW,
  },
  searchPlaceholder: {
    flex: 1,
    color: BRAND.muted,
    fontSize: 14,
    fontWeight: "500",
  },
  searchMic: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: BRAND.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  // Section headers
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: BRAND.text,
    letterSpacing: -0.3,
  },
  viewAll: { color: GREEN, fontWeight: "800", fontSize: 13 },

  // Categories
  catRow: {
    gap: 12,
    paddingRight: 16,
    paddingBottom: 24,
  },

  catCard: {
    width: 92,
    minHeight: 118,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BRAND.borderLight,
    alignItems: "center",
    paddingTop: 6,
    paddingBottom: 10,
    paddingHorizontal: 5,
    ...CARD_SHADOW,
  },

  catIcon: {
    width: 78,
    height: 78,
    borderRadius: 16,
    overflow: "hidden",
  },

  catImage: {
    width: "100%",
    height: "100%",
  },

  catLabel: {
    marginTop: 7,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },

  // Price cards
  priceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: BRAND.borderLight,
    ...CARD_SHADOW,
  },
  priceImage: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: BRAND.primaryLight,
  },
  priceBody: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: "800", color: BRAND.text },
  priceRange: { marginTop: 3, fontSize: 13, fontWeight: "900", color: GREEN },
  priceMeta: {
    marginTop: 2,
    fontSize: 11,
    color: BRAND.muted,
    fontWeight: "600",
  },
  trendBadge: {
    backgroundColor: BRAND.success,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  trendBadgeDown: { backgroundColor: BRAND.danger },
  trendText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },

  // Ad cards
  adCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: BRAND.borderLight,
    ...CARD_SHADOW,
  },
  adImageWrap: {
    width: 100,
    height: 112,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: BRAND.primaryLight,
  },
  adImage: { width: 100, height: 112 },
  adBody: { flex: 1, justifyContent: "center" },
  meta: { marginTop: 2, fontSize: 12, color: BRAND.muted, fontWeight: "600" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  adPrice: { marginTop: 8, fontSize: 13, fontWeight: "900", color: GREEN },
  adBadges: { position: "absolute", top: 6, left: 6, gap: 4 },
  featuredBadge: {
    backgroundColor: "#C2410C",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  newBadge: {
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeOnImageText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900" },
  heartOnImage: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...CARD_SHADOW,
  },
});
