import { supabase } from "@/lib/supabase";
import { useAppSession } from "@/lib/appSession";
import VegLoader from "@/components/VegLoader";
import EmptyState from "@/components/EmptyState";
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

type AdItem = {
  id: string;
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
};

const FILTERS = ["All", "Fruits", "Vegetables", "Spices", "Nuts & Dry Fruits", "Fresh Herbs"];

const FALLBACK: AdItem[] = [
  {
    id: "fb-tomato-grapes",
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

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string | string[] }>();
  const session = useAppSession();
  const [query, setQuery] = useState(paramQuery(params.q));
  const [filter, setFilter] = useState("All");
  const [filterOpen, setFilterOpen] = useState(false);
  const [items, setItems] = useState<AdItem[]>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const next = paramQuery(params.q);
    if (next) setQuery(next);
  }, [params.q]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("containers")
          .select(
            "id,title,route_from,route_to,market_location,price,currency,container_type,qty,image_url,category,created_at,is_active"
          )
          .eq("is_active", true)
          .order("created_at", { ascending: false });
        if (!mounted) return;
        const rows = (data as AdItem[]) ?? [];
        setItems(rows.length ? rows : FALLBACK);
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
      const hay = [item.title, item.route_from, item.route_to, item.market_location, item.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, filter]);

  function wishPayload(item: AdItem) {
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

  function renderItem({ item }: { item: AdItem }) {
    const origin = item.route_from || "Peru";
    const wishlisted = session.isLoggedIn && session.isWishlisted(item.id);

    return (
      <Pressable style={styles.card} onPress={() => session.openAdInsights(JSON.stringify(item))}>
        <Image
          source={{ uri: produceImage(item.title, item.category, item.image_url) }}
          style={styles.image}
        />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title || "Fresh Produce"}
            </Text>
            {session.isLoggedIn ? (
              <Pressable
                hitSlop={8}
                onPress={() => session.toggleWishlist(wishPayload(item))}
              >
                <Ionicons name={wishlisted ? "heart" : "heart-outline"} size={18} color={GREEN} />
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.meta}>
            {countryFlag(origin)} {origin}
          </Text>
          <Text style={styles.meta}>{containerLabel(item.container_type, item.qty)}</Text>
          <Text style={styles.meta}>Available: {item.market_location || item.route_to || "Dubai"}</Text>
          <Text style={styles.price}>{formatPrice(item.currency, item.price)} / Container</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
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
            <Ionicons name="heart-outline" size={22} color={GREEN} />
          </Pressable>
        ) : null}
        <Pressable
          style={styles.filterBtn}
          onPress={() => {
            Keyboard.dismiss();
            setFilterOpen(true);
          }}
        >
          <Ionicons name="options-outline" size={22} color="#111827" />
        </Pressable>
      </View>

      <View style={styles.countRow}>
        <Text style={styles.heading}>Search Results</Text>
        <Text style={styles.count}>
          {results.length} {results.length === 1 ? "ad" : "ads"}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <VegLoader context="search" label="Searching listings…" />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
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

      <Modal visible={filterOpen} transparent animationType="fade" onRequestClose={() => setFilterOpen(false)}>
        <Pressable style={styles.modalBg} onPress={() => setFilterOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Filter by category</Text>
            {FILTERS.map((chip) => (
              <Pressable
                key={chip}
                style={[styles.chip, filter === chip && styles.chipOn]}
                onPress={() => {
                  setFilter(chip);
                  setFilterOpen(false);
                }}
              >
                <Text style={[styles.chipText, filter === chip && styles.chipTextOn]}>{chip}</Text>
              </Pressable>
            ))}
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
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EEF2F0",
  },
  countRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  heading: { fontSize: 22, fontWeight: "800", color: "#111827" },
  count: { color: "#9CA3AF", fontSize: 14, fontWeight: "600" },
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
  },
  image: { width: 96, height: 96, borderRadius: 12, backgroundColor: "#F3F4F6" },
  body: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, fontSize: 15, fontWeight: "800", color: "#111827" },
  meta: { marginTop: 4, fontSize: 12, color: "#6B7280", fontWeight: "600" },
  price: { marginTop: 8, fontSize: 14, fontWeight: "800", color: "#111827" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { textAlign: "center", color: "#6B7280", marginTop: 40, paddingHorizontal: 24 },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.35)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 10,
  },
  modalHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    marginBottom: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111827", marginBottom: 6 },
  chip: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  chipOn: { backgroundColor: GREEN, borderColor: GREEN },
  chipText: { fontWeight: "800", color: "#111827" },
  chipTextOn: { color: "#FFFFFF" },
});
