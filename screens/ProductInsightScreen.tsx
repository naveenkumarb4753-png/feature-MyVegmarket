import TradingViewCandleChart, { type DualCandlePoint } from "@/components/TradingViewCandleChart";
import AnimatedPressable from "@/components/AnimatedPressable";
import { BRAND } from "@/constants/colors";
import EmptyState from "@/components/EmptyState";
import VegLoader from "@/components/VegLoader";
import {
  INSIGHT_RANGES,
  expectedShipmentArrival,
  fetchProductInsight,
  filterTrendByRange,
  formatInsightUpdatedAt,
  type InsightRange,
  type ProductInsight,
  type TrendPoint,
} from "@/lib/productInsights";
import ProduceImage from "@/components/ProduceImage";
import { useAppSession } from "@/lib/appSession";
import { safeBack } from "@/lib/nav";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Line, Polyline } from "react-native-svg";

const { width: SCREEN_W } = Dimensions.get("window");

function formatPct(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function RangeDropdown({
  value,
  onChange,
}: {
  value: InsightRange;
  onChange: (next: InsightRange) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.dropdownWrap}>
      <Pressable
        style={styles.dropdownButton}
        onPress={() => setOpen((prev) => !prev)}
        accessibilityRole="button"
        accessibilityLabel={`Time period: ${value}`}
      >
        <Text style={styles.dropdownButtonText}>{value}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={BRAND.text} />
      </Pressable>
      {open ? (
        <View style={styles.dropdownMenu}>
          {INSIGHT_RANGES.map((item) => (
            <Pressable
              key={item}
              style={[styles.dropdownItem, item === value && styles.dropdownItemActive]}
              onPress={() => {
                onChange(item);
                setOpen(false);
              }}
            >
              <Text style={[styles.dropdownItemText, item === value && styles.dropdownItemTextActive]}>
                {item}
              </Text>
              {item === value ? <Ionicons name="checkmark" size={15} color={BRAND.primary} /> : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function PriceChart({ data }: { data: TrendPoint[] }) {
  const w = SCREEN_W - 64;
  const h = 150;
  const marketValues = data.map((point) => point.marketAvg);
  const myValues = data.map((point) => point.myPrice);
  const allValues = [...marketValues, ...myValues];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  const toPoints = (values: number[]) =>
    values
      .map((value, index) => {
        const x = (index / Math.max(values.length - 1, 1)) * (w - 20) + 10;
        const y = h - 24 - ((value - min) / range) * (h - 48);
        return `${x},${y}`;
      })
      .join(" ");

  const lastMarket = marketValues[marketValues.length - 1];
  const lastMy = myValues[myValues.length - 1];

  return (
    <View>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#2563EB" }]} />
          <Text style={styles.legendText}>Al Aweer</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: BRAND.primary }]} />
          <Text style={styles.legendText}>MyVeg</Text>
        </View>
      </View>
      <Svg width={w} height={h}>
        <Line x1={10} y1={h - 24} x2={w - 10} y2={h - 24} stroke={BRAND.border} strokeWidth={1} />
        <Polyline points={toPoints(marketValues)} fill="none" stroke="#2563EB" strokeWidth={2.5} />
        <Polyline points={toPoints(myValues)} fill="none" stroke={BRAND.primary} strokeWidth={2.5} />
        {marketValues.length > 0 ? (
          <Circle
            cx={((marketValues.length - 1) / Math.max(marketValues.length - 1, 1)) * (w - 20) + 10}
            cy={h - 24 - ((lastMarket - min) / range) * (h - 48)}
            r={4}
            fill="#2563EB"
          />
        ) : null}
        {myValues.length > 0 ? (
          <Circle
            cx={((myValues.length - 1) / Math.max(myValues.length - 1, 1)) * (w - 20) + 10}
            cy={h - 24 - ((lastMy - min) / range) * (h - 48)}
            r={4}
            fill={BRAND.primary}
          />
        ) : null}
      </Svg>
    </View>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down" | "neutral";
}) {
  const color =
    tone === "up" ? "#15803D" : tone === "down" ? "#DC2626" : BRAND.text;
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

export default function ProductInsightScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; item?: string }>();
  const session = useAppSession();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<ProductInsight | null>(null);
  const [range, setRange] = useState<InsightRange>("1M");
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [isChartInteracting, setIsChartInteracting] = useState(false);

  const productId = useMemo(() => {
    if (params.id) return params.id;
    if (params.item) {
      try {
        const parsed = JSON.parse(params.item);
        return parsed.id as string;
      } catch {
        return null;
      }
    }
    return null;
  }, [params]);

  useEffect(() => {
    if (!session.ready) return;
    if (session.isLoggedIn) {
      if (!productId) {
        setLoading(false);
        return;
      }
      // Only show full loader on initial load; on range changes keep existing data visible
      if (!product) setLoading(true);
      setRangeError(null);
      fetchProductInsight(productId, range)
        .then((nextProduct) => {
          if (nextProduct) {
            setProduct(nextProduct);
            setRangeError(null);
          } else {
            setRangeError("No data available for this timeframe.");
          }
          setLoading(false);
        })
        .catch((err: unknown) => {
          console.warn("[ProductInsight] fetch error:", err);
          // Don't clear existing product — keep last good data visible
          setRangeError("Couldn't load data for this timeframe. Showing last available data.");
          setLoading(false);
        });
      return;
    }

    if (productId) {
      session.openPriceInsights(productId);
      return;
    }

    session.setIntendedRole("buyer");
    router.replace("/(tabs)/account");
  }, [session.ready, session.isLoggedIn, productId, range, router, session]);

  const visibleTrend = useMemo(
    () => (product ? filterTrendByRange(product.trend, range) : []),
    [product, range]
  );

  const visibleStats = useMemo(() => {
    if (!visibleTrend.length) return null;
    const marketValues = visibleTrend.map((point) => point.marketAvg);
    const myValues = visibleTrend.map((point) => point.myPrice);
    const marketMin = Math.min(...marketValues);
    const marketMax = Math.max(...marketValues);
    const myMin = Math.min(...myValues);
    const myMax = Math.max(...myValues);
    const marketChange =
      marketValues[0] ? ((marketValues[marketValues.length - 1] - marketValues[0]) / marketValues[0]) * 100 : 0;
    const myChange =
      myValues[0] ? ((myValues[myValues.length - 1] - myValues[0]) / myValues[0]) * 100 : 0;
    return { marketMin, marketMax, myMin, myMax, marketChange, myChange };
  }, [visibleTrend]);

  if (!session.ready || !session.isLoggedIn) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <VegLoader context="prices" label="Redirecting to login…" />
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <VegLoader context="prices" label="Loading price insights…" />
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <EmptyState
          variant="error"
          title="Price insight unavailable"
          subtitle="This product may have been delisted or the data hasn't synced yet."
          actionLabel="Go Back"
          onAction={() => safeBack(router, "/(tabs)/prices")}
        />
      </SafeAreaView>
    );
  }

  const latest = visibleTrend[visibleTrend.length - 1];
  const arrival = expectedShipmentArrival(product.shipment_mode);
  // Prefer the first meaningful (non-zero) price: MyVeg → Al Aweer market rate.
  const currentPrice =
    latest?.myPrice ||
    product.myveg_price_aed ||
    latest?.marketAvg ||
    product.market_price_aed ||
    0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        scrollEnabled={!isChartInteracting}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.backRow} onPress={() => safeBack(router, "/(tabs)/prices")}>
          <Ionicons name="arrow-back" size={20} color={BRAND.text} />
          <Text style={styles.backText}>Al Aweer Prices</Text>
        </Pressable>

        <ProduceImage
          title={product.name}
          category={product.category}
          imageUrl={product.image_url}
          style={styles.hero}
          contentFit="cover"
        />

        <View style={styles.highlightRow}>
          <View style={styles.highlightCard}>
            <Text style={styles.highlightLabel}>CURRENT PRICE</Text>
            <Text style={styles.highlightValue}>AED {Number(currentPrice).toFixed(2)}</Text>
            <Text style={styles.highlightSub}>per {product.unit || "Kg"}</Text>
          </View>
          <View style={[styles.highlightCard, styles.highlightCardArrival]}>
            <Text style={styles.highlightLabel}>EXPECTED SHIPMENT ARRIVAL</Text>
            <Text style={[styles.highlightValue, styles.highlightValueArrival]}>{arrival.label}</Text>
            <Text style={styles.highlightSub}>
              ~{arrival.days} days • {product.shipment_mode || "Air freight"}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>{product.name}</Text>
        <Text style={styles.sub}>
          {[product.packaging, product.unit, product.origin_country].filter(Boolean).join(" • ")}
        </Text>

        <View style={styles.priceRow}>
          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Al Aweer Rate</Text>
            <Text style={styles.priceValue}>
              AED {Number(product.market_price_aed ?? latest?.marketAvg ?? 0).toFixed(2)}
            </Text>
            <Text style={styles.priceUnit}>/ {product.unit || "Kg"}</Text>
            <Text style={styles.updatedAt}>
              Updated {formatInsightUpdatedAt(product.marketUpdatedAt ?? product.updated_at)}
            </Text>
          </View>
          <View style={[styles.priceCard, styles.priceCardAlt]}>
            <Text style={styles.priceLabel}>MyVeg Rate</Text>
            <Text style={[styles.priceValue, { color: BRAND.accent }]}>
              AED {Number(product.myveg_price_aed ?? latest?.myPrice ?? 0).toFixed(2)}
            </Text>
            <Text style={styles.priceUnit}>/ {product.unit || "Kg"}</Text>
          </View>
        </View>

        {/* Timeframe warning banner */}
        {rangeError ? (
          <View style={styles.rangeWarningBanner}>
            <Ionicons name="information-circle-outline" size={14} color="#92400E" />
            <Text style={styles.rangeWarningText}>{rangeError}</Text>
          </View>
        ) : null}

        {/* TradingView Interactive Candlestick Chart */}
        <TradingViewCandleChart
          data={
            visibleTrend.map((pt, idx, arr) => {
              const alPrev = arr[idx - 1]?.marketAvg || pt.marketAvg;
              const alOpen = alPrev || pt.marketAvg;
              const alClose = pt.marketAvg;
              const alMax = Math.max(alOpen, alClose);
              const alMin = Math.min(alOpen, alClose);
              const alSpread = alMax - alMin || 0.4;

              const myPrev = arr[idx - 1]?.myPrice || pt.myPrice;
              const myOpen = myPrev || pt.myPrice;
              const myClose = pt.myPrice;
              const myMax = Math.max(myOpen, myClose);
              const myMin = Math.min(myOpen, myClose);
              const mySpread = myMax - myMin || 0.4;

              return {
                date: pt.time,
                alAweerOpen: alOpen,
                alAweerHigh: alMax + alSpread * 0.3,
                alAweerLow: Math.max(0.1, alMin - alSpread * 0.3),
                alAweerClose: alClose,
                myVegOpen: myOpen,
                myVegHigh: myMax + mySpread * 0.3,
                myVegLow: Math.max(0.1, myMin - mySpread * 0.3),
                myVegClose: myClose,
              };
            })
          }
          timeFrame={range as any}
          onTimeFrameChange={(tf) => setRange(tf as InsightRange)}
          onInteractionStart={() => setIsChartInteracting(true)}
          onInteractionEnd={() => setIsChartInteracting(false)}
          title="Price Chart Analysis Graph"
          height={270}
        />

        {product.price_note ? (
          <View style={styles.noteCard}>
            <Ionicons name="information-circle-outline" size={18} color={BRAND.primary} />
            <Text style={styles.noteText}>{product.price_note}</Text>
          </View>
        ) : null}

        {product.shipment_mode ? (
          <View style={styles.metaCard}>
            <Ionicons name="airplane-outline" size={18} color={BRAND.muted} />
            <Text style={styles.metaText}>Shipment: {product.shipment_mode}</Text>
          </View>
        ) : null}

        {/* Live Quote & Inquiry Action */}
        <AnimatedPressable
          style={styles.inquireCta}
          onPress={() =>
            router.push({
              pathname: "/inquiry-box",
              params: { product: product.name, unit: product.unit || "Kg" },
            } as any)
          }
        >
          <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" />
          <Text style={styles.inquireCtaText}>Request Live Quote / Inquire</Text>
        </AnimatedPressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.pageBg },
  content: { padding: 16, paddingBottom: 32 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  backText: { fontSize: 15, fontWeight: "700", color: BRAND.text },
  hero: { width: "100%", height: 200, borderRadius: 20, backgroundColor: BRAND.primaryLight },
  title: { marginTop: 16, fontSize: 26, fontWeight: "900", color: BRAND.text },
  sub: { marginTop: 6, fontSize: 14, color: BRAND.muted, fontWeight: "600" },
  priceRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  priceCard: {
    flex: 1,
    backgroundColor: BRAND.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  priceCardAlt: { backgroundColor: BRAND.accentSoft, borderColor: "#FFD9B8" },
  priceLabel: { fontSize: 12, fontWeight: "700", color: BRAND.muted },
  priceValue: { marginTop: 4, fontSize: 22, fontWeight: "900", color: BRAND.primary },
  priceUnit: { marginTop: 2, fontSize: 12, color: BRAND.muted, fontWeight: "600" },
  updatedAt: { marginTop: 8, fontSize: 11, color: BRAND.muted, fontWeight: "600" },
  chartCard: {
    marginTop: 16,
    backgroundColor: BRAND.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
    // Lift the header (and its overflowing dropdown menu) above the sibling
    // stats grid / chart so menu items stay clickable on web.
    position: "relative",
    zIndex: 40,
  },
  chartTitle: { fontSize: 16, fontWeight: "800", color: BRAND.text },
  dropdownWrap: { position: "relative", zIndex: 20 },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: BRAND.pageBg,
    borderWidth: 1,
    borderColor: BRAND.border,
    minWidth: 74,
    justifyContent: "space-between",
  },
  dropdownButtonText: { fontSize: 13, fontWeight: "800", color: BRAND.text },
  dropdownMenu: {
    position: "absolute",
    top: 42,
    right: 0,
    minWidth: 120,
    backgroundColor: BRAND.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
    paddingVertical: 4,
    zIndex: 30,
    ...Platform.select({
      web: { boxShadow: "0 8px 24px rgba(0,0,0,0.12)" } as object,
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
      },
    }),
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dropdownItemActive: { backgroundColor: BRAND.primaryLight },
  dropdownItemText: { fontSize: 13, fontWeight: "700", color: BRAND.text },
  dropdownItemTextActive: { color: BRAND.primary, fontWeight: "900" },
  highlightRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  highlightCard: {
    flex: 1,
    backgroundColor: BRAND.primary,
    borderRadius: 18,
    padding: 16,
  },
  highlightCardArrival: { backgroundColor: "#1D4ED8" },
  highlightLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: "rgba(255,255,255,0.85)",
  },
  highlightValue: { marginTop: 8, fontSize: 22, fontWeight: "900", color: "#FFFFFF" },
  highlightValueArrival: { fontSize: 18 },
  highlightSub: { marginTop: 4, fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.85)" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    width: "31%",
    flexGrow: 1,
    backgroundColor: BRAND.pageBg,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  statLabel: { fontSize: 10, fontWeight: "700", color: BRAND.muted },
  statValue: { marginTop: 4, fontSize: 13, fontWeight: "900", color: BRAND.text },
  legendRow: { flexDirection: "row", gap: 14, marginBottom: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 99 },
  legendText: { fontSize: 12, fontWeight: "700", color: BRAND.muted },
  noteCard: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
    backgroundColor: BRAND.primaryLight,
    borderRadius: 14,
    padding: 14,
  },
  noteText: { flex: 1, color: BRAND.text, fontWeight: "600", lineHeight: 20 },
  metaCard: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
  },
  metaText: { color: BRAND.muted, fontWeight: "600" },
  inquireCta: {
    marginTop: 20,
    height: 52,
    borderRadius: 999,
    backgroundColor: BRAND.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: BRAND.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  inquireCtaText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },
  rangeWarningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  rangeWarningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#92400E",
    lineHeight: 17,
  },
});
