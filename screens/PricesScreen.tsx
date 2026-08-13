import GlobalSearchBar from "@/components/GlobalSearchBar";
import AnimatedPressable from "@/components/AnimatedPressable";
import EmptyState from "@/components/EmptyState";
import ProduceImage from "@/components/ProduceImage";
import VegLoader from "@/components/VegLoader";
import { BRAND } from "@/constants/colors";
import { useAppSession } from "@/lib/appSession";
import {
  GREEN,
  HD_IMAGES,
  LOCAL_IMAGES,
  PAGE_BG,
  TEXT,
  categoryAccent,
  countryFlag,
  matchCategory,
} from "@/lib/produceUi";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Image } from "expo-image";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ProductRow = {
  id: string;
  slug: string | null;
  name: string;
  category: string | null;
  unit: string | null;
  packaging: string | null;
  image_url: string | null;
  active?: boolean | null;
  market_price_aed: number | null;
  myveg_price_aed: number | null;
  price_note: string | null;
  origin_country: string | null;
  shipment_mode: string | null;
  updated_at: string | null;
  sort_order: number | null;
  selected_date_price?: number | null;
  min_price?: number | null;
  max_price?: number | null;
  latest_updated_at?: string | null;
};

type PriceUpdateRow = {
  published_product_id: string | null;
  product_key: string | null;
  price: number | null;
  created_at: string | null;
};

const FALLBACK_CATEGORIES = [
  "All",
  "Vegetables",
  "Fruits",
  "Spices",
  "Nuts",
  "Eggs",
  "Oils",
];

const CALENDAR_START = new Date(2026, 0, 1);
const DUBAI_OFFSET = "+04:00";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Al Aweer calendar begins Jan 2026; default to today when later. */
function getInitialSelectedDate() {
    const today = startOfDay(new Date());
    return today < CALENDAR_START ? new Date(CALENDAR_START) : today;
  }

export default function PricesScreen() {
  const { width } = useWindowDimensions();
  const session = useAppSession();
  // Cards are full-row horizontal — always single column
  const numColumns = 1;
  const cardWidth = width - 28;

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDate, setSelectedDate] = useState(getInitialSelectedDate);
  const [tempDate, setTempDate] = useState(getInitialSelectedDate);
  const [showDateModal, setShowDateModal] = useState(false);

  async function fetchProducts(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          id,
          slug,
          name,
          category,
          unit,
          packaging,
          image_url,
          active,
          market_price_aed,
          myveg_price_aed,
          price_note,
          origin_country,
          shipment_mode,
          updated_at,
          sort_order
        `)
        .eq("active", true)
        .order("category", { ascending: true })
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (productsError) throw productsError;

      const { startIso, endIso } = getDayRange(selectedDate);

      const slugToId = new Map<string, string>();
      (productsData ?? []).forEach((product) => {
        slugToId.set(product.id, product.id);
        if (product.slug) slugToId.set(product.slug, product.id);
      });

      const { data: updatesData, error: updatesError } = await supabase
        .from("price_updates")
        .select(`
          published_product_id,
          product_key,
          price,
          created_at
        `)
        .eq("status", "approved")
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .order("created_at", { ascending: true });

      if (updatesError) throw updatesError;

      const groupedMap = new Map<
        string,
        {
          min_price: number | null;
          max_price: number | null;
          latest_updated_at: string | null;
          selected_date_price: number | null;
        }
      >();

      (updatesData as PriceUpdateRow[] | null)?.forEach((row) => {
        if (row.price == null) return;

        const productId =
          row.published_product_id ??
          (row.product_key ? slugToId.get(row.product_key) : undefined);
        if (!productId) return;

        const existing = groupedMap.get(productId);

        if (!existing) {
          groupedMap.set(productId, {
            min_price: row.price,
            max_price: row.price,
            latest_updated_at: row.created_at,
            selected_date_price: row.price,
          });
        } else {
          const rowDate = row.created_at ? new Date(row.created_at) : null;
          const existingDate = existing.latest_updated_at
            ? new Date(existing.latest_updated_at)
            : null;

          const isNewer =
            !!rowDate && (!existingDate || rowDate.getTime() > existingDate.getTime());

          groupedMap.set(productId, {
            min_price:
              existing.min_price == null
                ? row.price
                : Math.min(existing.min_price, row.price),
            max_price:
              existing.max_price == null
                ? row.price
                : Math.max(existing.max_price, row.price),
            latest_updated_at: isNewer ? row.created_at : existing.latest_updated_at,
            selected_date_price: isNewer ? row.price : existing.selected_date_price,
          });
        }
      });

      const mergedProducts: ProductRow[] = (productsData ?? []).map((product) => {
        const stats = groupedMap.get(product.id);

        // Fall back to the product's stored Al Aweer rate (products.market_price_aed)
        // when there is no approved price_update for the selected day, so cards show
        // the existing price instead of an empty "Pending / -- AED" state.
        const basePrice = product.market_price_aed ?? null;

        return {
          ...product,
          selected_date_price: stats?.selected_date_price ?? basePrice,
          min_price: stats?.min_price ?? basePrice,
          max_price: stats?.max_price ?? basePrice,
          latest_updated_at: stats?.latest_updated_at ?? product.updated_at ?? null,
        };
      });

      setProducts(mergedProducts);
    } catch (err) {
      console.error("fetchProducts error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, [selectedDate]);

  const categoryOptions = useMemo(() => {
    const dbCategories = Array.from(
      new Set(products.map((p) => (p.category || "").trim()).filter(Boolean))
    );

    const normalized =
      dbCategories.length > 0 ? dbCategories : FALLBACK_CATEGORIES.slice(1);

    return ["All", ...normalized];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const categoryMatch = matchCategory(item.category, selectedCategory);

      const q = search.trim().toLowerCase();
      const searchMatch =
        q.length === 0 ||
        item.name.toLowerCase().includes(q) ||
        (item.category || "").toLowerCase().includes(q) ||
        (item.packaging || "").toLowerCase().includes(q) ||
        (item.origin_country || "").toLowerCase().includes(q);

      return categoryMatch && searchMatch;
    });
  }, [products, search, selectedCategory]);

  const pricedCount = useMemo(
    () => filteredProducts.filter((item) => item.selected_date_price != null).length,
    [filteredProducts]
  );

  function formatPrice(value: number | null | undefined) {
    if (value === null || value === undefined) return "--";
    return Number(value).toFixed(2);
  }

  function formatUpdatedTime(dateString: string | null | undefined) {
    if (!dateString) return "No update";

    const now = new Date();
    const updated = new Date(dateString);

    if (Number.isNaN(updated.getTime())) return "No update";

    const diffMs = now.getTime() - updated.getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  function formatBadgeDate(date: Date) {
    return date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .toUpperCase();
  }

  function formatInputDate(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function parseInputDate(value: string) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function getDayRange(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const day = `${y}-${m}-${d}`;

    return {
      startIso: `${day}T00:00:00.000${DUBAI_OFFSET}`,
      endIso: `${day}T23:59:59.999${DUBAI_OFFSET}`,
    };
  }

  function openDateModal() {
    setTempDate(selectedDate);
    setShowDateModal(true);
  }

  function applyDateSelection() {
    setSelectedDate(new Date(tempDate));
    setShowDateModal(false);
  }

  function renderStickyHeader() {
    return (
      <View style={styles.stickyHeader}>
        {/* Top title bar */}
        <View style={styles.stickyTopRow}>
          <View style={styles.stickyTitleBlock}>
            <Text style={styles.stickyTitle}>Al Aweer Market</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>

          <Pressable style={styles.dateChipCompact} onPress={openDateModal}>
            <Ionicons name="calendar-outline" size={13} color={GREEN} />
            <Text style={styles.dateChipTextCompact}>{formatBadgeDate(selectedDate)}</Text>
            <Ionicons name="chevron-down" size={11} color={GREEN} />
          </Pressable>
        </View>

        {/* Animated Global Search Bar */}
        <GlobalSearchBar
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch("")}
          interactive
        />

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {categoryOptions.map((cat) => {
            const active = selectedCategory === cat;
            const accent = categoryAccent(cat === "All" ? null : cat);
            return (
              <Pressable
                key={cat}
                style={[
                  styles.chip,
                  active && { backgroundColor: accent.accent, borderColor: accent.accent },
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.chipText, active && styles.chipTextOn]}>{cat}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  // renderFilters removed — merged into renderStickyHeader

  function renderProduct({ item }: { item: ProductRow }) {
    const accent = categoryAccent(item.category);
    const hasPrice = item.selected_date_price != null;

    return (
      <AnimatedPressable
        style={styles.mobileCard}
        onPress={() => session.openPriceInsights(item.id)}
      >
        {/* Image thumb */}
        <View style={[styles.mobileImageWrap, { backgroundColor: accent.bg }]}>
          <ProduceImage
            title={item.name}
            category={item.category}
            imageUrl={item.image_url}
            style={styles.mobileCardImage}
          />
          <View style={[styles.mobileCategoryPill, { backgroundColor: accent.accent }]}>
            <Text style={styles.mobileCategoryPillText}>{accent.label}</Text>
          </View>
        </View>

        {/* Info body */}
        <View style={styles.mobileCardBody}>
          {/* Top Row: Name + Origin right next to image, Price tag on right */}
          <View style={styles.mobileHeaderRow}>
            <View style={styles.mobileTitleBlock}>
              <Text style={styles.mobileProductName} numberOfLines={1}>{item.name}</Text>
              {item.origin_country ? (
                <Text style={styles.mobileOrigin}>
                  {countryFlag(item.origin_country)} {item.origin_country}
                </Text>
              ) : null}
            </View>

            {/* Price tag beside name */}
            <View style={styles.mobilePriceBlock}>
              <Text style={styles.mobilePriceLabel}>Al Aweer Rate</Text>
              <View style={styles.mobilePriceInline}>
                <Text style={[styles.mobilePriceValue, { color: accent.accent }]}>
                  {hasPrice ? formatPrice(item.selected_date_price) : "—"}
                  {hasPrice ? <Text style={styles.mobileAED}> AED</Text> : null}
                </Text>
                {!hasPrice ? (
                  <View style={styles.mobilePendingPill}>
                    <Text style={styles.mobilePendingText}>Pending</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* Min / Max range */}
          <View style={styles.mobileRangeRow}>
            <View style={styles.mobileRangeItem}>
              <Text style={styles.mobileRangeLabel}>Min</Text>
              <Text style={styles.mobileRangeValue}>{formatPrice(item.min_price)}</Text>
            </View>
            <View style={styles.mobileRangeDivider} />
            <View style={styles.mobileRangeItem}>
              <Text style={styles.mobileRangeLabel}>Max</Text>
              <Text style={styles.mobileRangeValue}>{formatPrice(item.max_price)}</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.mobileFooterRow}>
            <View style={styles.mobileUpdatedRow}>
              <Ionicons name="time-outline" size={9} color={MUTED} />
              <Text style={styles.mobileUpdatedText}>{formatUpdatedTime(item.latest_updated_at)}</Text>
            </View>
            <View style={[styles.mobileArrow, { backgroundColor: accent.bg }]}>
              <Ionicons name="chevron-forward" size={12} color={accent.accent} />
            </View>
          </View>
        </View>
      </AnimatedPressable>
    );
  }

  function renderDateModal() {
    if (!showDateModal) return null;

    if (Platform.OS === "android") {
      return (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          maximumDate={new Date()}
          minimumDate={CALENDAR_START}
          onChange={(event, date) => {
            setShowDateModal(false);

            if (event.type === "set" && date) {
              const pickedDate = new Date(date);
              setTempDate(pickedDate);
              setSelectedDate(pickedDate);
            }
          }}
        />
      );
    }

    return (
      <Modal
        transparent
        visible={showDateModal}
        animationType="fade"
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Date</Text>
            <Text style={styles.modalSubtitle}>
              Choose a date to view that day{"'"}s Al Aweer prices.
            </Text>

            {Platform.OS === "web" ? (
              <View style={styles.webDateWrap}>
                <input
                  type="date"
                  value={formatInputDate(tempDate)}
                  max={formatInputDate(new Date())}
                  onChange={(e) => setTempDate(parseInputDate(e.target.value))}
                  style={{
                    width: "100%",
                    height: 48,
                    borderRadius: 12,
                    border: "1px solid #D0D5DD",
                    padding: "0 14px",
                    fontSize: 16,
                    outline: "none",
                    boxSizing: "border-box",
                    display: "block",
                    backgroundColor: "#FFFFFF",
                  }}
                />
              </View>
            ) : (
              <View style={styles.nativePickerWrap}>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  maximumDate={new Date()}
                  minimumDate={CALENDAR_START}
                  onChange={(_, date) => {
                    if (date) setTempDate(date);
                  }}
                />
              </View>
            )}

            <View style={styles.modalButtonRow}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.modalButton, styles.applyButton]}
                onPress={applyDateSelection}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <VegLoader context="prices" label="Loading Al Aweer prices…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      {renderDateModal()}

      {/* Sticky header — always visible above the list */}
      {renderStickyHeader()}

      <FlatList
        data={filteredProducts}
        key={numColumns}
        numColumns={numColumns}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        columnWrapperStyle={numColumns > 1 ? styles.columnWrap : undefined}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onRefresh={() => fetchProducts(true)}
        refreshing={refreshing}
        ListHeaderComponent={
          <Text style={styles.resultsMeta}>
            {filteredProducts.length} item{filteredProducts.length === 1 ? "" : "s"} •{" "}
            {formatBadgeDate(selectedDate)}
          </Text>
        }
        ListEmptyComponent={
          <EmptyState
            title="No products found"
            subtitle="Try another search or category."
          />
        }
      />
    </SafeAreaView>
  );
}

const MUTED = "#6B7280";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PAGE_BG },
  listContent: { paddingHorizontal: 14, paddingBottom: 32, paddingTop: 8 },
  columnWrap: { gap: 10, marginBottom: 10 },

  // ── Sticky top header ──
  stickyHeader: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.borderLight,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  stickyTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stickyTitleBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stickyTitle: { fontSize: 18, fontWeight: "900", color: TEXT },
  stickyIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN },
  liveText: { fontSize: 9, fontWeight: "900", color: BRAND.primaryDark, letterSpacing: 0.6 },
  countPill: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
  },
  countPillText: { fontSize: 11, fontWeight: "700", color: BRAND.muted },
  dateChipCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: BRAND.pageBg,
    borderWidth: 1,
    borderColor: BRAND.borderLight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dateChipTextCompact: { fontSize: 11, fontWeight: "800", color: BRAND.primaryDark },

  // ── Search ──
  searchBox: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: BRAND.borderLight,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 8,
    shadowColor: BRAND.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 15, color: TEXT, paddingVertical: 0 },
  chips: { gap: 8, paddingRight: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: BRAND.borderLight,
  },
  chipText: { fontSize: 12, fontWeight: "800", color: BRAND.muted },
  chipTextOn: { color: "#FFFFFF", fontWeight: "900" },
  resultsMeta: {
    fontSize: 11,
    fontWeight: "700",
    color: MUTED,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  card: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(15,157,58,0.08)",
    shadowColor: BRAND.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  imageWrap: {
    height: 108,
    backgroundColor: "#FFFFFF",
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  categoryPill: {
    position: "absolute",
    top: 8,
    left: 8,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  cardBody: {
    padding: 12,
    gap: 4,
  },
  productName: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
    color: TEXT,
    minHeight: 36,
  },
  packaging: {
    fontSize: 11,
    color: MUTED,
    fontWeight: "600",
  },
  origin: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "600",
  },
  priceRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  aed: {
    fontSize: 12,
    fontWeight: "700",
  },
  pendingPill: {
    backgroundColor: "#FEF3C7",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pendingText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#B45309",
  },
  rangeRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  rangeItem: {
    flex: 1,
    alignItems: "center",
  },
  rangeLabel: {
    fontSize: 10,
    color: MUTED,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  rangeValue: {
    fontSize: 13,
    fontWeight: "800",
    color: TEXT,
    marginTop: 2,
  },
  rangeDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#D1D5DB",
    marginHorizontal: 8,
  },
  footerRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  updatedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  updatedText: {
    fontSize: 11,
    color: MUTED,
    fontWeight: "600",
  },
  noteText: {
    marginTop: 4,
    fontSize: 11,
    color: "#64748B",
    lineHeight: 15,
    fontStyle: "italic",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: TEXT,
  },
  modalSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
  },
  webDateWrap: {
    marginTop: 18,
    width: "100%",
  },
  nativePickerWrap: {
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
  },
  modalButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  applyButton: {
    backgroundColor: GREEN,
  },
  cancelButtonText: {
    color: "#475467",
    fontWeight: "700",
    fontSize: 14,
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  // ── Mobile-first Card (full-row layout) ──
  mobileCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BRAND.borderLight,
    shadowColor: BRAND.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    marginBottom: 12,
    alignItems: "center",
    height: 140,
  },
  mobileImageWrap: {
    width: 115,
    height: 140,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#F0FFF4",
  },
  mobileCardImage: {
    width: 115,
    height: 140,
  },
  mobileCategoryPill: {
    position: "absolute",
    bottom: 8,
    left: 8,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  mobileCategoryPillText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  mobileCardBody: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: "space-between",
    gap: 2,
  },
  mobileHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 6,
  },
  mobileTitleBlock: {
    flex: 1,
    gap: 2,
  },
  mobileProductName: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
    color: TEXT,
  },
  mobilePackaging: { fontSize: 10, color: MUTED, fontWeight: "500" },
  mobileOrigin: { fontSize: 10, color: BRAND.textSecondary, fontWeight: "600" },
  mobilePriceBlock: {
    alignItems: "flex-end",
  },
  mobilePriceLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  mobilePriceInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mobilePriceValue: { fontSize: 16, fontWeight: "900", letterSpacing: -0.3 },
  mobileAED: { fontSize: 11, fontWeight: "700" },
  mobilePendingPill: {
    backgroundColor: "#FEF3C7",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  mobilePendingText: { fontSize: 9, fontWeight: "800", color: "#B45309" },
  mobileRangeRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BRAND.pageBg,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: BRAND.borderLight,
  },
  mobileRangeItem: { flex: 1, alignItems: "center" },
  mobileRangeLabel: {
    fontSize: 8,
    color: MUTED,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  mobileRangeValue: { fontSize: 12, fontWeight: "800", color: TEXT, marginTop: 1 },
  mobileRangeDivider: { width: 1, height: 20, backgroundColor: BRAND.borderLight, marginHorizontal: 4 },
  mobileFooterRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mobileUpdatedRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  mobileUpdatedText: { fontSize: 9, color: MUTED, fontWeight: "500" },
  mobileNoteText: { marginTop: 3, fontSize: 9, color: "#64748B", lineHeight: 13, fontStyle: "italic" },
  mobileArrow: {
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
});
