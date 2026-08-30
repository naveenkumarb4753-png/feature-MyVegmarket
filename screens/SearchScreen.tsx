import EmptyState from "@/components/EmptyState";
import VegLoader from "@/components/VegLoader";
import { useAppSession } from "@/lib/appSession";
import {
  GREEN,
  HD_IMAGES,
  PAGE_BG,
  containerLabel,
  countryFlag,
  formatPrice,
  matchCategory,
  produceImage,
} from "@/lib/produceUi";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ResultKind = "ad" | "product";

type SearchResult = {
  id: string;
  kind: ResultKind;
  title: string | null;
  route_from: string | null;
  route_to: string | null;
  market_location: string | null;
  price: number | null;
  currency: string | null;
  container_type: string | null;
  qty: number | null;
  image_url: string | null;
  category: string | null;
  created_at?: string | null;
  unit?: string | null;
};

const FILTERS = [
  "All",
  "Fruits",
  "Vegetables",
  "Spices",
  "Nuts & Dry Fruits",
  "Fresh Herbs",
  "Eggs",
  "Oils",
];

const FALLBACK: SearchResult[] = [
  {
    id: "fb-tomato-grapes",
    kind: "ad",
    title: "Fresh Tomato Grapes",
    route_from: "Peru",
    route_to: "Dubai",
    market_location: "Dubai",
    price: 12500,
    currency: "AED",
    container_type: "40ft Container",
    qty: 1,
    image_url: HD_IMAGES.tomatoes,
    category: "vegetables",
    created_at: new Date().toISOString(),
  },
  {
    id: "fb-local-tomatoes",
    kind: "ad",
    title: "Local Tomatoes",
    route_from: "UAE",
    route_to: "Dubai",
    market_location: "Al Aweer",
    price: 8900,
    currency: "AED",
    container_type: "40ft Container",
    qty: 1,
    image_url: HD_IMAGES.tomatoes,
    category: "vegetables",
  },
  {
    id: "fb-cherry-tomatoes",
    kind: "ad",
    title: "Cherry Tomatoes",
    route_from: "Netherlands",
    route_to: "Jebel Ali",
    market_location: "Jebel Ali",
    price: 14200,
    currency: "AED",
    container_type: "40ft Container",
    qty: 1,
    image_url: HD_IMAGES.tomatoes,
    category: "vegetables",
  },
  {
    id: "fb-oranges",
    kind: "ad",
    title: "Fresh Oranges",
    route_from: "South Africa",
    route_to: "Jebel Ali",
    market_location: "Jebel Ali",
    price: 9800,
    currency: "AED",
    container_type: "40ft Container",
    qty: 1,
    image_url: HD_IMAGES.oranges,
    category: "fruits",
  },
  {
    id: "fb-apples",
    kind: "ad",
    title: "Fresh Red Apples",
    route_from: "Poland",
    route_to: "Dubai",
    market_location: "Dubai",
    price: 11200,
    currency: "AED",
    container_type: "40ft Container",
    qty: 1,
    image_url: HD_IMAGES.apples,
    category: "fruits",
  },
  {
    id: "fb-grapes",
    kind: "ad",
    title: "Fresh Green Grapes",
    route_from: "Peru",
    route_to: "Dubai",
    market_location: "Dubai",
    price: 12500,
    currency: "AED",
    container_type: "40ft Container",
    qty: 1,
    image_url: HD_IMAGES.grapes,
    category: "fruits",
  },
];

function paramQuery(q?: string | string[]) {
  if (Array.isArray(q)) return q[0] || "";
  return q || "";
}

/** Route params carry either a free-text query or a category name. */
function syncQueryAndFilter(raw: string): { query: string; filter: string } {
  const next = raw.trim();
  if (!next) return { query: "", filter: "All" };
  const known = FILTERS.find((f) => f !== "All" && f.toLowerCase() === next.toLowerCase());
  if (known) return { query: "", filter: known };
  return { query: next, filter: "All" };
}

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string | string[] }>();
  const session = useAppSession();
  const [query, setQuery] = useState(paramQuery(params.q));
  const [filter, setFilter] = useState("All");
  const [filterOpen, setFilterOpen] = useState(false);
  const [items, setItems] = useState<SearchResult[]>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = paramQuery(params.q);
    if (!raw) return;
    const synced = syncQueryAndFilter(raw);
    setQuery(synced.query);
    setFilter(synced.filter);
  }, [params.q]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        // Search across every live data source: container ads, products and
        // their approved price updates (used to annotate product rows).
        const [adsRes, productsRes] = await Promise.all([
          supabase
            .from("containers")
            .select(
              "id,title,route_from,route_to,market_location,price,currency,container_type,qty,image_url,category,created_at,is_active"
            )
            .eq("is_active", true)
            .order("created_at", { ascending: false }),
          supabase
            .from("products")
            .select("id,name,category,unit,origin_country,image_url,market_price_aed,updated_at,active")
            .eq("active", true)
            .order("updated_at", { ascending: false }),
        ]);
        if (!mounted) return;

        const ads: SearchResult[] = ((adsRes.data as SearchResult[] | null) ?? []).map((row) => ({
          ...row,
          kind: "ad",
        }));

        const products: SearchResult[] = ((productsRes.data ?? []) as Record<string, unknown>[]).map(
          (p) => ({
            id: String(p.id),
            kind: "product" as const,
            title: (p.name as string) ?? null,
            route_from: (p.origin_country as string) ?? null,
            route_to: null,
            market_location: "Al Aweer",
            price: (p.market_price_aed as number) ?? null,
            currency: "AED",
            container_type: null,
            qty: null,
            image_url: (p.image_url as string) ?? null,
            category: (p.category as string) ?? null,
            created_at: (p.updated_at as string) ?? null,
            unit: (p.unit as string) ?? null,
          })
        );

        const merged = [...ads, ...products];
        setItems(merged.length ? merged : FALLBACK);

        const { data: updates } = await supabase
          .from("price_updates")
          .select("published_product_id,price,created_at")
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(200);
        if (!mounted || !updates?.length) return;

        const latest = new Map<string, { price: number; at: string }>();
        (updates as { published_product_id: string | null; price: number | null; created_at: string | null }[]).forEach(
          (u) => {
            if (!u.published_product_id || u.price == null) return;
            if (!latest.has(u.published_product_id)) {
              latest.set(u.published_product_id, { price: u.price, at: u.created_at ?? "" });
            }
          }
        );
        setItems((prev) =>
          prev.map((it) => {
            const u = latest.get(it.id);
            return u && it.kind === "product" ? { ...it, price: u.price, created_at: u.at || it.created_at } : it;
          })
        );
      } catch {
        if (mounted) setItems(FALLBACK);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const catOk = matchCategory(item.category || item.title, filter);
      if (!catOk) return false;
      if (!q) return true;
      const hay = [
        item.title,
        item.route_from,
        item.route_to,
        item.market_location,
        item.category,
        item.unit,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, filter]);

  function wishPayload(item: SearchResult) {
    const origin = item.route_from || "Peru";
    return {
      id: item.id,
      title: item.title || "Fresh Produce",
      origin,
      location: item.market_location || item.route_to,
      priceLabel: formatPrice(item.currency, item.price),
      imageUrl: item.image_url,
      containerLabel: containerLabel(item.container_type, item.qty),
    };
  }

  function renderItem({ item }: { item: SearchResult }) {
    const origin = item.route_from || "Peru";
    const wishlisted = session.isLoggedIn && session.isWishlisted(item.id);
    const isProduct = item.kind === "product";

    return (
      <Pressable
        style={styles.card}
        onPress={() =>
          isProduct
            ? session.openPriceInsights(item.id)
            : session.openAdInsights(JSON.stringify(item))
        }
      >
        <Image
          source={{ uri: produceImage(item.title, item.category, item.image_url) }}
          style={styles.image}
        />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title || "Fresh Produce"}
            </Text>
            {!isProduct && session.isLoggedIn ? (
              <Pressable
                hitSlop={8}
                onPress={() => session.toggleWishlist(wishPayload(item))}
              >
                <Ionicons name={wishlisted ? "heart" : "star-outline"} size={18} color={GREEN} />
              </Pressable>
            ) : null}
            {isProduct ? (
              <View style={styles.sourcePill}>
                <Text style={styles.sourcePillText}>Al Aweer</Text>
              </View>
            ) : null}
          </View>
          {isProduct ? (
            <>
              <Text style={styles.meta}>
                {countryFlag(origin)} {origin} • Market rate
              </Text>
              <Text style={styles.price}>
                {formatPrice(item.currency, item.price)} / {item.unit || "kg"}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.meta}>
                {countryFlag(origin)} {origin}
              </Text>
              <Text style={styles.meta}>{containerLabel(item.container_type, item.qty)}</Text>
              <Text style={styles.meta}>Available: {item.market_location || item.route_to || "Dubai"}</Text>
              <Text style={styles.price}>{formatPrice(item.currency, item.price)} / Container</Text>
            </>
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={17} color="#111827" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search for fruits, vegetables, shipments..."
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            autoFocus
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </Pressable>
          ) : null}
        </View>
        {session.isLoggedIn ? (
          <Pressable style={styles.filterBtn} onPress={() => session.setWishlistOpen(true)}>
            <Ionicons name="star-outline" size={21} color="#111827" />
          </Pressable>
        ) : null}
        <Pressable
          style={styles.filterBtn}
          onPress={() => {
            Keyboard.dismiss();
            setFilterOpen((v) => !v);
          }}
        >
          <Ionicons name="options-outline" size={21} color="#111827" />
          {filter !== "All" ? <View style={styles.filterActiveDot} /> : null}
        </Pressable>
      </View>

      <View style={styles.countRow}>
        <Text style={styles.heading}>Search Results</Text>
        <Text style={styles.count}>
          {filter !== "All" ? `${filter} • ` : ""}
          {results.length} {results.length === 1 ? "result" : "results"}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <VegLoader context="search" label="Searching listings…" />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              title="No matches found"
              subtitle="Try another product name, origin, or category filter."
              icon="search-outline"
            />
          }
        />
      )}

      {/* Filter floating bubble — anchored top-right, in sync with the search box */}
      <Modal visible={filterOpen} transparent animationType="fade" onRequestClose={() => setFilterOpen(false)}>
        <Pressable style={styles.filterBackdrop} onPress={() => setFilterOpen(false)}>
          <Pressable style={styles.filterBubble} onPress={() => {}}>
            <Text style={styles.filterTitle}>Filter by category</Text>
            {FILTERS.map((chip) => {
              const active = filter === chip;
              return (
                <Pressable
                  key={chip}
                  style={[styles.filterChipRow, active && styles.filterChipRowOn]}
                  onPress={() => {
                    setFilter(chip);
                    setFilterOpen(false);
                  }}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextOn]}>{chip}</Text>
                  {active ? (
                    <Ionicons name="checkmark" size={16} color={GREEN} />
                  ) : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PAGE_BG },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
  },
  searchBox: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "#EEF2F0",
  },
  input: { flex: 1, fontSize: 15, color: "#111827", fontWeight: "600", paddingVertical: 0 },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EEF2F0",
  },
  filterActiveDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GREEN,
  },
  countRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  heading: { fontSize: 22, fontWeight: "600", color: "#111827" },
  count: { color: "#9CA3AF", fontSize: 14, fontWeight: "600" },
  list: { paddingHorizontal: 16, paddingBottom: 28 },
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF2F0",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
  },
  image: { width: 100, minHeight: 124, backgroundColor: "#F3F4F6" },
  body: { flex: 1, minWidth: 0, padding: 12, justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, fontSize: 15, fontWeight: "600", color: "#111827" },
  sourcePill: {
    backgroundColor: "#E8F5EC",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sourcePillText: { fontSize: 10, fontWeight: "700", color: GREEN },
  meta: { marginTop: 4, fontSize: 12, color: "#6B7280", fontWeight: "600" },
  price: { marginTop: 8, fontSize: 14, fontWeight: "700", color: "#111827" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { textAlign: "center", color: "#6B7280", marginTop: 40, paddingHorizontal: 24 },
  filterBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.25)",
    alignItems: "flex-end",
    paddingTop: 118,
    paddingHorizontal: 16,
  },
  filterBubble: {
    width: 248,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 8,
    shadowColor: "#111827",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 6,
  },
  filterChipRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  filterChipRowOn: { backgroundColor: "#E8F5EC" },
  filterChipText: { fontSize: 14, fontWeight: "600", color: "#111827" },
  filterChipTextOn: { color: GREEN, fontWeight: "700" },
});
