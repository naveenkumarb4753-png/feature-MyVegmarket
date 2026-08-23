import { supabase } from "@/lib/supabase";
import { useAppSession } from "@/lib/appSession";
import GlobalSearchBar from "@/components/GlobalSearchBar";
import AnimatedPressable from "@/components/AnimatedPressable";
import ProduceImage from "@/components/ProduceImage";
import {
  GREEN,
  HD_IMAGES,
  PAGE_BG,
  formatPrice,
  formatKgRange,
  produceImage,
  countryFlag,
  isNewListing,
  containerLabel,
} from "@/lib/produceUi";
import { BRAND } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
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
    tag: "FRESH SHIPMENTS",
    title: "Fresh Produce\nShipments",
    sub: "Connect directly with verified exporters & importers",
    cta: "Post Shipment",
    image: HD_IMAGES.hero,
    bg: "#0A8A3A",
    action: "postAd" as const,
  },
  {
    key: "b2",
    tag: "AL AWEER MARKET",
    title: "Al Aweer\nMarket Rates",
    sub: "Live wholesale prices updated daily from Dubai hub",
    cta: "View Rates",
    image: HD_IMAGES.tomatoes,
    bg: "#1D4ED8",
    action: "prices" as const,
  },
  {
    key: "b3",
    tag: "LIVE CONTAINERS",
    title: "Browse Live\nContainers",
    sub: "Explore refrigerated shipments arriving weekly",
    cta: "Browse Ads",
    image: HD_IMAGES.grapes,
    bg: "#D97706",
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
  const bannerWidth = SCREEN_W - 32;

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % HERO_BANNERS.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4500);

    return () => clearInterval(timer);
  }, []);

  const handleAction = (action: "postAd" | "prices" | "containers") => {
    if (action === "postAd") onPostAd();
    else if (action === "prices") onPrices();
    else onContainers();
  };

  const renderBanner = ({ item: banner }: { item: (typeof HERO_BANNERS)[0] }) => (
    <View style={[heroStyles.cardWrapper, { width: bannerWidth }]}>
      <View style={[heroStyles.card, { backgroundColor: banner.bg }]}>
        <View style={heroStyles.cardCopy}>
          <View style={heroStyles.livePill}>
            <View style={heroStyles.liveDot} />
            <Text style={heroStyles.liveText}>{banner.tag}</Text>
          </View>
          <Text style={heroStyles.cardTitle}>{banner.title}</Text>
          <Text style={heroStyles.cardSub} numberOfLines={2}>{banner.sub}</Text>
          <AnimatedPressable
            style={heroStyles.cardCta}
            onPress={() => handleAction(banner.action)}
            haptic
          >
            <Text style={[heroStyles.cardCtaText, { color: banner.bg }]}>{banner.cta}</Text>
            <Ionicons name="arrow-forward" size={13} color={banner.bg} />
          </AnimatedPressable>
        </View>
        <View style={heroStyles.cardImageWrap}>
          <ProduceImage
            title={banner.title}
            category="vegetables"
            imageUrl={banner.image}
            style={heroStyles.cardImage}
            contentFit="cover"
          />
        </View>
      </View>
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
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
          }, 80);
        }}
        getItemLayout={(_: any, index: number) => ({
          length: bannerWidth,
          offset: bannerWidth * index,
          index,
        })}
        style={[heroStyles.flatList, { width: bannerWidth }]}
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
  wrap: {
    marginBottom: 22,
    borderRadius: 20,
    overflow: "hidden",
  },
  flatList: {
    borderRadius: 20,
    overflow: "hidden",
  },
  cardWrapper: {
    borderRadius: 20,
    overflow: "hidden",
  },
  card: {
    width: "100%",
    height: 180,
    borderRadius: 20,
    overflow: "hidden",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    shadowColor: BRAND.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  cardCopy: {
    flex: 1,
    paddingTop: 18,
    paddingBottom: 18,
    paddingLeft: 18,
    paddingRight: 8,
    justifyContent: "space-between",
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    overflow: "hidden",
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  liveText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 26,
    letterSpacing: -0.4,
  },
  cardSub: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 11.5,
    fontWeight: "500",
    lineHeight: 16,
  },
  cardCta: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  cardCtaText: {
    fontSize: 11.5,
    fontWeight: "900",
  },
  cardImageWrap: {
    width: 126,
    height: 180,
    overflow: "hidden",
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  cardImage: {
    width: 126,
    height: 180,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    overflow: "hidden",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND.border,
  },
  dotActive: {
    width: 22,
    backgroundColor: BRAND.primary,
  },
});

// ─── Category Row ─────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: "Fruits",          image: HD_IMAGES.fruits },
  { key: "Vegetables",      image: HD_IMAGES.vegetables },
  { key: "Spices",          image: HD_IMAGES.spices },
  { key: "Nuts & Dry Fruits", image: HD_IMAGES.nuts },
  { key: "Fresh Herbs",     image: HD_IMAGES.herbs },
  { key: "Eggs",            image: HD_IMAGES.eggs },
  { key: "Oils & Fats",     image: HD_IMAGES.oils },
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
      Animated.timing(searchFade, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
        globalSearchIndex = (globalSearchIndex + 1) % SEARCH_TEXTS.length;
        setSearchText(SEARCH_TEXTS[globalSearchIndex]);
        Animated.timing(searchFade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      });
    }, 2800);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [searchFade]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { data: products } = await supabase
        .from("products")
        .select("id,name,image_url,market_price_aed,myveg_price_aed,updated_at,active")
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

      const grouped = new Map<string, { min: number; max: number; at: string | null }>();
      (updates || []).forEach((row: any) => {
        if (!row.published_product_id || row.price == null) return;
        const cur = grouped.get(row.published_product_id);
        if (!cur) {
          grouped.set(row.published_product_id, { min: row.price, max: row.price, at: row.created_at });
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
          if (min && max && min > 0) changePct = Math.round(((max - min) / min) * 100);
          return {
            id: p.id,
            name: p.name,
            image_url: p.image_url,
            min_price: min,
            max_price: max,
            latest_updated_at: stats?.at ?? p.updated_at,
            changePct,
          };
        })
      );

      const { data: adsData } = await supabase
        .from("containers")
        .select(
          "id,title,route_from,market_location,route_to,price,currency,container_type,qty,image_url,category,created_at"
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
    }, [load, session.refreshSession])
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={GREEN} />}
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
              <AnimatedPressable style={st.iconBtn} onPress={() => session.setWishlistOpen(true)} haptic>
                <Ionicons name="heart-outline" size={22} color="#111827" />
                {session.wishlist.length > 0 ? (
                  <View style={st.heartBadge}>
                    <Text style={st.heartBadgeText}>{session.wishlist.length}</Text>
                  </View>
                ) : null}
              </AnimatedPressable>
            ) : null}
            <AnimatedPressable style={st.iconBtn} onPress={() => router.push("/inquiry-box" as Href)} haptic>
              <Ionicons name="notifications-outline" size={22} color="#111827" />
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
            <Text style={st.viewAll}>View All →</Text>
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
              style={st.catItem}
              onPress={() => router.push(`/search?q=${encodeURIComponent(cat.key)}` as Href)}
              haptic
            >
              <View style={st.catCard}>
                <ProduceImage
                  title={cat.key}
                  category={cat.key}
                  imageUrl={cat.image}
                  style={st.catImage}
                  contentFit="cover"
                />
              </View>
              <Text style={st.catLabel} numberOfLines={2}>
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
                <Text style={st.cardTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={st.priceRange}>{formatKgRange(item.min_price, item.max_price)}</Text>
                <Text style={st.priceMeta}>Updated: {formatUpdated(item.latest_updated_at)}</Text>
              </View>
              <View style={[st.trendBadge, !up && st.trendBadgeDown]}>
                <Ionicons name={up ? "trending-up" : "trending-down"} size={12} color="#FFFFFF" />
                <Text style={st.trendText}>{item.changePct > 0 ? "+" : ""}{item.changePct}%</Text>
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
          const wishlisted = session.isLoggedIn && session.isWishlisted(item.id);
          const showNew = item.created_at ? isNewListing(item.created_at) : false;
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
                        containerLabel: containerLabel(item.container_type, item.qty),
                      })
                    }
                    haptic
                  >
                    <Ionicons
                      name={wishlisted ? "heart" : "heart-outline"}
                      size={15}
                      color={wishlisted ? "#E11D48" : "#111827"}
                    />
                  </AnimatedPressable>
                ) : null}
              </View>
              <View style={st.adBody}>
                <Text style={st.cardTitle} numberOfLines={1}>{item.title || "Fresh Produce"}</Text>
                <View style={st.metaRow}>
                  <Text style={st.meta}>{countryFlag(origin)} {origin}</Text>
                </View>
                <View style={st.metaRow}>
                  <Ionicons name="cube-outline" size={13} color={BRAND.muted} />
                  <Text style={st.meta}>{containerLabel(item.container_type, item.qty)}</Text>
                </View>
                <View style={st.metaRow}>
                  <Ionicons name="location-outline" size={13} color={BRAND.muted} />
                  <Text style={st.meta}>{item.market_location || item.route_to || "Dubai"}</Text>
                </View>
                <Text style={st.adPrice}>{formatPrice(item.currency, item.price)} / Container</Text>
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
  { id: "tomato", name: "Tomato (Local)", image_url: HD_IMAGES.tomatoes, min_price: 2.5, max_price: 3.2, latest_updated_at: new Date().toISOString(), changePct: 8 },
  { id: "grapes", name: "Green Grapes", image_url: HD_IMAGES.grapes, min_price: 5.8, max_price: 6.9, latest_updated_at: new Date().toISOString(), changePct: -3 },
  { id: "apples", name: "Fresh Apples", image_url: HD_IMAGES.apples, min_price: 4.2, max_price: 5.0, latest_updated_at: new Date().toISOString(), changePct: 2 },
];

const FALLBACK_ADS: AdCard[] = [
  { id: "grapes", title: "Fresh Green Grapes", route_from: "Peru", market_location: "Dubai", route_to: "Dubai", price: 12500, currency: "AED", container_type: "40ft Container", qty: 1, image_url: HD_IMAGES.grapes, category: "fruits", created_at: new Date().toISOString() },
  { id: "oranges", title: "Fresh Oranges", route_from: "South Africa", market_location: "Dubai", route_to: "Dubai", price: 9800, currency: "AED", container_type: "40ft Container", qty: 1, image_url: HD_IMAGES.oranges, category: "fruits", created_at: new Date().toISOString() },
  { id: "apples", title: "Fresh Red Apples", route_from: "Poland", market_location: "Dubai", route_to: "Dubai", price: 11200, currency: "AED", container_type: "40ft Container", qty: 1, image_url: HD_IMAGES.apples, category: "fruits", created_at: new Date().toISOString() },
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
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#111827",
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
  searchPlaceholder: { flex: 1, color: BRAND.muted, fontSize: 14, fontWeight: "500" },
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
  sectionTitle: { fontSize: 18, fontWeight: "600", color: BRAND.text, letterSpacing: -0.3 },
  viewAll: { color: GREEN, fontWeight: "800", fontSize: 13 },

  // Categories
  catRow: { gap: 12, paddingRight: 16, marginBottom: 24 },
  catItem: {
    width: 96,
    alignItems: "center",
  },
  catCard: {
    width: 96,
    height: 72,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BRAND.borderLight,
    ...CARD_SHADOW,
  },
  catImage: { width: 96, height: 72 },
  catLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: BRAND.text,
    textAlign: "center",
    marginTop: 7,
    lineHeight: 15,
  },

  // Price cards
  priceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BRAND.borderLight,
    paddingRight: 14,
    ...CARD_SHADOW,
  },
  priceImage: { width: 76, height: 82, backgroundColor: BRAND.primaryLight },
  priceBody: { flex: 1, paddingVertical: 12, paddingLeft: 12, paddingRight: 8 },
  cardTitle: { fontSize: 14, fontWeight: "600", color: BRAND.text },
  priceRange: { marginTop: 3, fontSize: 13, fontWeight: "900", color: GREEN },
  priceMeta: { marginTop: 2, fontSize: 11, color: BRAND.muted, fontWeight: "600" },
  trendBadge: {
    backgroundColor: BRAND.success,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trendBadgeDown: { backgroundColor: BRAND.danger },
  trendText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },

  // Ad cards
  adCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BRAND.borderLight,
    ...CARD_SHADOW,
  },
  adImageWrap: { width: 110, height: 130, overflow: "hidden", backgroundColor: BRAND.primaryLight },
  adImage: { width: 110, height: 130 },
  adBody: { flex: 1, justifyContent: "center", padding: 12 },
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
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#111827",
    ...CARD_SHADOW,
  },
});