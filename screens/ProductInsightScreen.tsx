import MarketTrendChart from "@/components/MarketTrendChart";
import AnimatedPressable from "@/components/AnimatedPressable";
import EmptyState from "@/components/EmptyState";
import ProduceImage from "@/components/ProduceImage";
import VegLoader from "@/components/VegLoader";
import {
  buildPreviewPath,
  computeLiteStats,
  fetchAlAweerLiteProduct,
  formatAed,
  formatDubaiDate,
  formatDubaiDateTime,
  formatPackagingLabel,
  normalizeForTrendRange,
  shipmentText,
  type AlAweerLiteData,
} from "@/lib/alAweerInsights";
import { useAppSession } from "@/lib/appSession";
import { safeBack } from "@/lib/nav";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";

/**
 * Product insight screen — a faithful mobile mirror of the production website
 * page myvegmarket.com/product/[slug]?lite=1 (Al Aweer lite variant): same
 * section order, copy, data queries and stats logic.
 */

// Exact site palette (myvegmarket.com product page)
const INK = "#111713";
const SUB = "#648770";
const BODY = "#33443a";
const PARA = "#4f6f5c";
const ICON_GREEN = "#315f45";
const GREEN = "#078a36";
const GREEN_SOFT = "#edf8f1";
const GREEN_SOFT_2 = "#e7f7ed";
const PAGE_BG = "#f6f8f7";
const CARD_BORDER = "#dde8e1";
const INNER_BORDER = "#e1e9e4";
const RATE_BORDER = "#dfe8e2";
const SPEC_DIVIDER = "#e6ede8";
const RED = "#d12f2f";
const BLUE = "#1467d4";
const PURPLE = "#6b21a8";
const ORANGE = "#ec6b19";
const ORANGE_SOFT = "#fff1e7";

const SUPPORT_WHATSAPP = "917010220771";
const SUPPORT_CALL = "+917010220771";

const ABOUT_CHECKS = [
  "Rich source of vitamins, minerals and antioxidants",
  "Suitable for restaurants, groceries and bulk buyers",
  "Consistent grading for reliable commercial use",
  "Carefully sourced and quality checked",
];

const WHY_CARDS: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }[] = [
  { icon: "shield-checkmark-outline", title: "Verified Al Aweer Prices", text: "Updated market rates from official and approved sources" },
  { icon: "people-outline", title: "Trusted by Businesses", text: "Designed for restaurants, groceries, resellers and exporters" },
  { icon: "cube-outline", title: "Bulk Sourcing Support", text: "Help finding reliable supply for larger business requirements" },
  { icon: "chatbubbles-outline", title: "WhatsApp Assistance", text: "Quick support for orders, market rates and product enquiries" },
];

function shipmentIcon(mode?: string | null): keyof typeof Ionicons.glyphMap {
  const m = (mode ?? "").toLowerCase().trim();
  if (m === "sea") return "boat-outline";
  if (m === "road") return "car-outline";
  if (m === "mixed") return "swap-horizontal-outline";
  return "airplane-outline";
}

function openWhatsApp(productName: string) {
  const msg = encodeURIComponent(`Hi, I need support for ${productName} (MyVegmarket).`);
  Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP}?text=${msg}`).catch(() => {});
}

function openCallSupport() {
  Linking.openURL(`tel:${SUPPORT_CALL}`).catch(() => {});
}

function shortDateLabel(time: string): string {
  const dt = new Date(time);
  if (Number.isNaN(dt.getTime())) return time.slice(0, 10);
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

/* ────────────────────────── small building blocks ────────────────────────── */

function SpecCell({
  icon,
  label,
  value,
  dividerLeft,
  dividerTop,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  dividerLeft?: boolean;
  dividerTop?: boolean;
}) {
  return (
    <View
      style={[
        styles.specCell,
        dividerLeft && styles.specCellLeftBorder,
        dividerTop && styles.specCellTopBorder,
      ]}
    >
      <View style={styles.specIconCircle}>
        <Ionicons name={icon} size={16} color={GREEN} />
      </View>
      <View style={styles.specTextBlock}>
        <Text style={styles.specLabel}>{label}</Text>
        <Text style={styles.specValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

function CheckRow({ text }: { text: string }) {
  return (
    <View style={styles.checkRow}>
      <Ionicons name="checkmark-circle" size={17} color={GREEN} />
      <Text style={styles.checkText}>{text}</Text>
    </View>
  );
}

function WhyCard({ icon, title, text }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }) {
  return (
    <View style={styles.whyCard}>
      <View style={styles.whyIconCircle}>
        <Ionicons name={icon} size={21} color={GREEN} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.whyTitle}>{title}</Text>
        <Text style={styles.whyText}>{text}</Text>
      </View>
    </View>
  );
}

function PrimaryButton({
  icon,
  label,
  onPress,
  outline,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  outline?: boolean;
}) {
  return (
    <AnimatedPressable
      style={[styles.actionButton, outline ? styles.actionButtonOutline : styles.actionButtonFill]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={19} color={outline ? GREEN : "#FFFFFF"} />
      <Text style={[styles.actionButtonText, outline ? { color: GREEN } : null]}>{label}</Text>
    </AnimatedPressable>
  );
}

/* ────────────────────────────── main screen ────────────────────────────── */

export default function ProductInsightScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; item?: string }>();
  const session = useAppSession();
  const { width: screenWidth } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [data, setData] = useState<AlAweerLiteData | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [isChartInteracting, setIsChartInteracting] = useState(false);

  const productId = useMemo(() => {
    if (params.id) return params.id;
    if (params.item) {
      try {
        const parsed = JSON.parse(params.item);
        return (parsed.id as string) ?? null;
      } catch {
        return null;
      }
    }
    return null;
  }, [params]);

  useEffect(() => {
    if (!session.ready) return;
    if (!session.isLoggedIn) {
      if (productId) session.openPriceInsights(productId);
      else {
        session.setIntendedRole("buyer");
        router.replace("/(tabs)/account");
      }
      return;
    }
    if (!productId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setFailed(false);
    fetchAlAweerLiteProduct(productId)
      .then((result) => {
        if (result) {
          setData(result);
          setFailed(false);
        } else {
          setFailed(true);
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        console.warn("[ProductInsight] fetch error:", err);
        setFailed(true);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.ready, session.isLoggedIn, productId]);

  const product = data?.product ?? null;
  const currentRate = useMemo(
    () => data?.marketPriceOverride ?? product?.market_price_aed ?? 0,
    [data, product]
  );

  const stats = useMemo(
    () => computeLiteStats(currentRate, data?.marketUpdatedAt ?? null, data?.history ?? []),
    [currentRate, data]
  );

  const previewPath = useMemo(
    () => (data?.history?.length ? buildPreviewPath(data.history) : ""),
    [data]
  );

  const handleChartInteractionStart = useCallback(() => {
    setIsChartInteracting(true);
  }, []);

  const handleChartInteractionEnd = useCallback(() => {
    setIsChartInteracting(false);
  }, []);

  const pulseAnim = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    if (!overlayVisible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.55, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [overlayVisible, pulseAnim]);

  if (!session.ready || !session.isLoggedIn || loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <VegLoader
          context="prices"
          label={session.isLoggedIn ? "Loading price insights…" : "Redirecting to login…"}
        />
      </SafeAreaView>
    );
  }

  if (failed || !product) {
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

  const name = product.name;
  const unit = product.unit ?? "kg";
  const origin = product.origin_country ?? "UAE";
  const shipText = shipmentText(product.shipment_mode);
  const packaging = formatPackagingLabel(product.packaging);
  const chartWidth = Math.min(screenWidth - 48, 900) - 24;

  const visiblePeriod =
    stats.from && stats.to
      ? `${formatDubaiDate(stats.from)} – ${formatDubaiDate(stats.to)}`
      : "Price history will appear here";

  const comparisonLabel =
    stats.changePercent != null
      ? `${stats.changePercent > 0 ? "+" : ""}${stats.changePercent.toFixed(1)}% vs previous`
      : "No comparison yet";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Breadcrumb */}
        <View style={styles.breadcrumbRow}>
          <Pressable style={styles.backCircle} onPress={() => safeBack(router, "/(tabs)/prices")}>
            <Ionicons name="arrow-back" size={18} color={INK} />
          </Pressable>
          <Pressable onPress={() => router.push("/(tabs)/index" as never)}>
            <Text style={styles.breadcrumbLink}>Home</Text>
          </Pressable>
          <Ionicons name="chevron-forward" size={13} color={SUB} />
          <Pressable onPress={() => router.push("/categories" as never)}>
            <Text style={styles.breadcrumbLink}>Products</Text>
          </Pressable>
          <Ionicons name="chevron-forward" size={13} color={SUB} />
          <Text style={styles.breadcrumbCurrent} numberOfLines={1}>
            {name}
          </Text>
        </View>

        {/* ── Hero section ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroImageCard}>
            <View style={styles.topQualityBadge}>
              <Ionicons name="ribbon-outline" size={13} color="#FFFFFF" />
              <Text style={styles.topQualityText}>Top Quality</Text>
            </View>
            <View style={styles.heroImageInner}>
              <ProduceImage
                title={product.name}
                category={product.category}
                imageUrl={product.image_url}
                style={styles.heroImage}
                contentFit="contain"
              />
            </View>
          </View>

          <View style={styles.heroInfoCol}>
            <Text style={styles.heroTitle}>{name}</Text>

            <View style={styles.verifiedRow}>
              <View style={styles.verifiedCircle}>
                <Ionicons name="shield-checkmark-outline" size={15} color={GREEN} />
              </View>
              <Text style={styles.verifiedText}>Premium Quality • Fresh • Hand Selected</Text>
            </View>

            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Ionicons name="location-outline" size={16} color={ICON_GREEN} />
                <Text style={styles.infoText}>
                  <Text style={styles.infoLabel}>Origin:</Text> {origin}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="star-outline" size={16} color={ICON_GREEN} />
                <Text style={styles.infoText}>
                  <Text style={styles.infoLabel}>Grade:</Text> Regular
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="scale-outline" size={16} color={ICON_GREEN} />
                <Text style={styles.infoText}>
                  <Text style={styles.infoLabel}>Unit:</Text> {unit}
                </Text>
              </View>
              {shipText ? (
                <View style={styles.infoItem}>
                  <Ionicons name={shipmentIcon(product.shipment_mode)} size={16} color={ICON_GREEN} />
                  <Text style={styles.infoText}>
                    <Text style={styles.infoLabel}>Shipment:</Text> {shipText}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Al Aweer market rate card */}
            <View style={styles.rateCard}>
              <View style={styles.rateTopRow}>
                <View style={styles.rateMainBlock}>
                  <Text style={styles.rateLabel}>Al Aweer market rate</Text>
                  <Text style={styles.rateValue}>{formatAed(currentRate)}</Text>
                </View>
                <View style={styles.rateUpdatedBlock}>
                  <Text style={styles.rateUpdatedLabel}>Last updated</Text>
                  <Text style={styles.rateUpdatedValue}>
                    {formatDubaiDateTime(data?.marketUpdatedAt)}
                  </Text>
                </View>
              </View>
              <View style={styles.comparisonChip}>
                <Text style={styles.comparisonText}>{comparisonLabel}</Text>
              </View>
            </View>

            {/* Hero actions */}
            <View style={styles.heroButtonRow}>
              <PrimaryButton
                icon="trending-up-outline"
                label="View Price Trend"
                onPress={() => setOverlayVisible(true)}
              />
              <PrimaryButton
                icon="chatbubble-ellipses-outline"
                label="WhatsApp Enquiry"
                outline
                onPress={() => openWhatsApp(name)}
              />
            </View>
          </View>
        </View>

        {/* ── Spec strip (6 cells) ── */}
        <View style={styles.specStrip}>
          <View style={styles.specRow}>
            <SpecCell icon="grid-outline" label="Type" value="Regular" />
            <SpecCell icon="cube-outline" label="Packaging" value={packaging} dividerLeft />
          </View>
          <View style={styles.specRow}>
            <SpecCell icon="location-outline" label="Origin" value={origin} dividerTop />
            <SpecCell
              icon={shipmentIcon(product.shipment_mode)}
              label="Shipment"
              value={shipText ?? "—"}
              dividerLeft
              dividerTop
            />
          </View>
          <View style={styles.specRow}>
            <SpecCell icon="scale-outline" label="Unit" value={unit} dividerTop />
            <SpecCell icon="storefront-outline" label="Market Source" value="Al Aweer" dividerLeft dividerTop />
          </View>
        </View>

        {/* ── Market Price Overview ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="stats-chart-outline" size={19} color={GREEN} />
            <Text style={styles.sectionTitle}>Market Price Overview</Text>
            <Text style={styles.sectionTitleSuffix}>(Al Aweer)</Text>
          </View>

          <View style={styles.statGrid}>
            <StatCard label="Current Price" value={formatAed(stats.current)} color={GREEN} />
            <StatCard label="Previous Price" value={formatAed(stats.previous)} />
            <StatCard label="Highest Price" value={formatAed(stats.highest)} color={RED} />
            <StatCard label="Lowest Price" value={formatAed(stats.lowest)} color={BLUE} />
            <StatCard label="Average Price" value={formatAed(stats.average)} color={GREEN} />
            <StatCard label="Median Price" value={formatAed(stats.median)} color={PURPLE} />
          </View>

          <View style={styles.overviewBottomRow}>
            <View style={styles.overviewBottomItem}>
              <View style={[styles.overviewIconCircle, { backgroundColor: ORANGE_SOFT }]}>
                <Ionicons name="compass-outline" size={18} color={ORANGE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statLabel}>Total Updates</Text>
                <Text style={styles.overviewBigValue}>{stats.updates}</Text>
              </View>
            </View>
            <View style={[styles.overviewBottomItem, { marginTop: 10 }]}>
              <View style={[styles.overviewIconCircle, { backgroundColor: GREEN_SOFT }]}>
                <Ionicons name="calendar-outline" size={18} color={GREEN} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statLabel}>Visible Period</Text>
                <Text style={styles.overviewPeriodValue} numberOfLines={1}>
                  {visiblePeriod}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Price Trend Preview ── */}
        <View style={styles.sectionCard}>
          <View style={styles.previewHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Price Trend Preview</Text>
              <Text style={styles.previewSubtitle}>Last 1 year • Real Al Aweer history</Text>
            </View>
            <View style={styles.monitorBadge}>
              <Ionicons name="trending-up-outline" size={18} color={GREEN} />
            </View>
          </View>

          {previewPath ? (
            <View style={styles.previewChartBox}>
              <Svg viewBox="0 0 520 180" style={styles.previewSvg} preserveAspectRatio="none">
                <Path d={previewPath} fill="none" stroke="#1db954" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
              </Svg>
            </View>
          ) : (
            <View style={styles.previewEmptyBox}>
              <View style={styles.previewEmptyCircle}>
                <Ionicons name="trending-up-outline" size={24} color={GREEN} />
              </View>
              <Text style={styles.previewEmptyTitle}>Market history will appear here</Text>
              <Text style={styles.previewEmptyText}>
                Historical prices will be shown after more Al Aweer updates are available.
              </Text>
            </View>
          )}

          <Text style={styles.previewCaption}>
            View the full interactive chart with detailed market insights
          </Text>

          <Pressable style={styles.previewOpenButton} onPress={() => setOverlayVisible(true)}>
            <Ionicons name="trending-up-outline" size={17} color={GREEN} />
            <Text style={styles.previewOpenButtonText}>Open Detailed Price Analysis</Text>
          </Pressable>
        </View>

        {/* ── About the Product ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="leaf-outline" size={19} color={GREEN} />
            <Text style={styles.sectionTitle}>About the Product</Text>
          </View>
          <Text style={styles.aboutParagraph}>
            {name} is selected for consistent quality, dependable grading and reliable supply. It is
            suitable for restaurants, groceries, resellers and other B2B customers who need clear
            market information before purchasing.
          </Text>
          <View style={styles.aboutChecks}>
            {ABOUT_CHECKS.map((text) => (
              <CheckRow key={text} text={text} />
            ))}
          </View>
        </View>

        {/* ── Why Source from MyVegmarket? ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="shield-checkmark-outline" size={19} color={GREEN} />
            <Text style={styles.sectionTitle}>Why Source from MyVegmarket?</Text>
          </View>
          <View style={styles.whyGrid}>
            {WHY_CARDS.map((card) => (
              <WhyCard key={card.title} icon={card.icon} title={card.title} text={card.text} />
            ))}
          </View>
        </View>

        {/* ── Bulk supply banner ── */}
        <View style={styles.bulkBanner}>
          <View style={styles.bulkImageWrap}>
            <View style={styles.bulkImageCircle} />
            <ProduceImage
              title={product.name}
              category={product.category}
              imageUrl={product.image_url}
              style={styles.bulkImage}
              contentFit="contain"
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.bulkTitle}>Need {name} in bulk?</Text>
            <Text style={styles.bulkText}>
              Get current market guidance and sourcing support for your restaurant, grocery, resale
              or export requirement.
            </Text>
            <View style={styles.bulkChips}>
              {["Daily Price Updates", "Best Market Rates", "Sourcing Support"].map((chip) => (
                <View key={chip} style={styles.bulkChip}>
                  <Ionicons name="checkmark-circle" size={14} color={GREEN} />
                  <Text style={styles.bulkChipText}>{chip}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.bulkButtonCol}>
            <PrimaryButton icon="headset-outline" label="WhatsApp Support" onPress={() => openWhatsApp(name)} />
            <PrimaryButton icon="call-outline" label="Call Support" outline onPress={openCallSupport} />
          </View>
        </View>
      </ScrollView>

      {/* ── Full-screen trend overlay (site ?trend=1 equivalent) ── */}
      <Modal
        visible={overlayVisible}
        animationType="slide"
        onRequestClose={() => setOverlayVisible(false)}
        statusBarTranslucent={false}
      >
        <SafeAreaView style={styles.overlaySafe} edges={["top"]}>
          <View style={styles.overlayTopBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.overlayTitle} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.overlaySubtitle}>Al Aweer market trend</Text>
            </View>
            <View style={styles.overlayTopActions}>
              <View style={styles.avgPill}>
                <Text style={styles.avgPillText}>Avg: AED {stats.average.toFixed(2)}</Text>
              </View>
              <Pressable style={styles.closeButton} onPress={() => setOverlayVisible(false)}>
                <Ionicons name="close-outline" size={16} color={INK} />
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.overlayChartWrap}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!isChartInteracting}
          >
            <View style={styles.overlayChartCard}>
              {(data?.history?.length ?? 0) === 0 ? (
                <Animated.View
                  style={[styles.chartPulse, { opacity: pulseAnim }]}
                />
              ) : (
                <MarketTrendChart
                  series={data?.history ?? []}
                  width={chartWidth}
                  productName={name}
                  onInteractionStart={handleChartInteractionStart}
                  onInteractionEnd={handleChartInteractionEnd}
                />
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

/* ───────────────────────────────── styles ───────────────────────────────── */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PAGE_BG },
  content: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 40 },

  /* Breadcrumb */
  breadcrumbRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  backCircle: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 2,
  },
  breadcrumbLink: { fontSize: 13, fontWeight: "500", color: SUB },
  breadcrumbCurrent: { fontSize: 13, fontWeight: "900", color: INK, flexShrink: 1 },

  /* Hero */
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 14,
    shadowColor: "#111713",
    shadowOpacity: 0.06,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  heroImageCard: {
    minHeight: 300,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: INNER_BORDER,
    backgroundColor: "#f8faf9",
    overflow: "hidden",
    position: "relative",
  },
  topQualityBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    shadowColor: GREEN,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  topQualityText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  heroImageInner: { minHeight: 300, padding: 28, alignItems: "center", justifyContent: "center" },
  heroImage: { width: "100%", height: 230 },
  heroInfoCol: { marginTop: 16, paddingHorizontal: 2 },
  heroTitle: { fontSize: 32, lineHeight: 36, fontWeight: "900", letterSpacing: -1.2, color: INK },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  verifiedCircle: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: GREEN_SOFT_2,
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedText: { fontSize: 13, fontWeight: "700", color: INK },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 22,
    rowGap: 12,
    marginTop: 20,
  },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 7 },
  infoText: { fontSize: 13, fontWeight: "400", color: BODY },
  infoLabel: { fontWeight: "700", color: INK },

  /* Rate card */
  rateCard: {
    marginTop: 22,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: RATE_BORDER,
    backgroundColor: "#fbfdfb",
    padding: 18,
  },
  rateTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
  },
  rateMainBlock: { flex: 1, minWidth: 150 },
  rateLabel: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: SUB,
  },
  rateValue: {
    marginTop: 4,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.8,
    color: GREEN,
  },
  rateUpdatedBlock: {
    borderLeftWidth: 1,
    borderLeftColor: INNER_BORDER,
    paddingLeft: 14,
  },
  rateUpdatedLabel: { fontSize: 12, fontWeight: "700", color: SUB },
  rateUpdatedValue: { marginTop: 4, fontSize: 13, fontWeight: "900", color: INK },
  comparisonChip: {
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: "#f4f7f5",
    paddingHorizontal: 18,
    paddingVertical: 13,
    alignSelf: "flex-start",
  },
  comparisonText: { fontSize: 13, fontWeight: "900", color: SUB },

  /* Buttons */
  heroButtonRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  actionButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 14,
  },
  actionButtonFill: {
    backgroundColor: GREEN,
    shadowColor: GREEN,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  actionButtonOutline: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: GREEN,
  },
  actionButtonText: { color: "#FFFFFF", fontWeight: "900", fontSize: 13.5 },

  /* Spec strip */
  specStrip: {
    marginTop: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: "hidden",
    shadowColor: "#111713",
    shadowOpacity: 0.045,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  specRow: { flexDirection: "row" },
  specCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  specCellLeftBorder: { borderLeftWidth: 1, borderLeftColor: SPEC_DIVIDER },
  specCellTopBorder: { borderTopWidth: 1, borderTopColor: SPEC_DIVIDER },
  specIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: GREEN_SOFT,
    alignItems: "center",
    justifyContent: "center",
  },
  specTextBlock: { flex: 1, minWidth: 0 },
  specLabel: {
    fontSize: 9.5,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: SUB,
  },
  specValue: { marginTop: 2, fontSize: 13.5, fontWeight: "900", color: INK },

  /* Section cards */
  sectionCard: {
    marginTop: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 20,
    shadowColor: "#111713",
    shadowOpacity: 0.045,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 19, fontWeight: "900", color: INK },
  sectionTitleSuffix: { fontSize: 14, fontWeight: "500", color: SUB, marginTop: 3 },

  /* Stats grid */
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    width: "48.3%",
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: INNER_BORDER,
    backgroundColor: "#fcfdfc",
    padding: 15,
  },
  statLabel: {
    fontSize: 9.5,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: SUB,
  },
  statValue: { marginTop: 8, fontSize: 17, fontWeight: "900", color: INK },
  overviewBottomRow: { marginTop: 10 },
  overviewBottomItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: INNER_BORDER,
    backgroundColor: "#fcfdfc",
    padding: 15,
  },
  overviewIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  overviewBigValue: { marginTop: 3, fontSize: 17, fontWeight: "900", color: INK },
  overviewPeriodValue: { marginTop: 3, fontSize: 14, fontWeight: "900", color: INK },

  /* Preview */
  previewHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  previewSubtitle: { marginTop: 3, fontSize: 13, fontWeight: "500", color: SUB },
  monitorBadge: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: GREEN_SOFT,
    alignItems: "center",
    justifyContent: "center",
  },
  previewChartBox: {
    minHeight: 150,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: INNER_BORDER,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  previewSvg: { width: "100%", height: 160 },
  previewEmptyBox: {
    minHeight: 170,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: INNER_BORDER,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  previewEmptyCircle: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: GREEN_SOFT,
    alignItems: "center",
    justifyContent: "center",
  },
  previewEmptyTitle: { fontSize: 15, fontWeight: "900", color: INK },
  previewEmptyText: {
    fontSize: 12.5,
    fontWeight: "500",
    color: SUB,
    textAlign: "center",
    lineHeight: 18,
  },
  previewCaption: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "500",
    color: SUB,
  },
  previewOpenButton: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: GREEN,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  previewOpenButtonText: { fontSize: 13.5, fontWeight: "900", color: GREEN },

  /* About */
  aboutParagraph: { fontSize: 13.5, lineHeight: 23, fontWeight: "400", color: PARA },
  aboutChecks: { marginTop: 18, gap: 12 },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  checkText: { flex: 1, fontSize: 13, fontWeight: "500", color: BODY, lineHeight: 19 },

  /* Why */
  whyGrid: { gap: 18 },
  whyCard: { flexDirection: "row", gap: 12 },
  whyIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: GREEN_SOFT,
    alignItems: "center",
    justifyContent: "center",
  },
  whyTitle: { fontSize: 13.5, fontWeight: "900", color: GREEN },
  whyText: { marginTop: 4, fontSize: 13, lineHeight: 21, fontWeight: "400", color: PARA },

  /* Bulk banner */
  bulkBanner: {
    marginTop: 18,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#d9e9df",
    backgroundColor: "#f0faf4",
    padding: 18,
    gap: 16,
    shadowColor: "#111713",
    shadowOpacity: 0.045,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  bulkImageWrap: {
    minHeight: 130,
    alignItems: "center",
    justifyContent: "center",
  },
  bulkImageCircle: {
    position: "absolute",
    width: 148,
    height: 148,
    borderRadius: 999,
    backgroundColor: "#dff4e7",
  },
  bulkImage: { width: 240, height: 118 },
  bulkTitle: { fontSize: 22, fontWeight: "900", letterSpacing: -0.6, color: INK },
  bulkText: { marginTop: 8, fontSize: 14, lineHeight: 24, fontWeight: "400", color: PARA },
  bulkChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, columnGap: 16, marginTop: 14 },
  bulkChip: { flexDirection: "row", alignItems: "center", gap: 6 },
  bulkChipText: { fontSize: 12, fontWeight: "700", color: ICON_GREEN },
  bulkButtonCol: { gap: 12 },

  /* Overlay */
  overlaySafe: { flex: 1, backgroundColor: PAGE_BG },
  overlayTopBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  overlayTitle: { fontSize: 22, fontWeight: "900", color: INK },
  overlaySubtitle: { marginTop: 2, fontSize: 13, fontWeight: "500", color: SUB },
  overlayTopActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  avgPill: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#e0e8e3",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  avgPillText: { fontSize: 12.5, fontWeight: "900", color: INK },
  closeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#e0e8e3",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  closeButtonText: { fontSize: 12.5, fontWeight: "900", color: INK },
  overlayControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 40,
  },
  rangeLabel: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: SUB,
  },
  overlayChartWrap: { paddingHorizontal: 16, paddingBottom: 24 },
  overlayChartCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e0e8e3",
    backgroundColor: "#FFFFFF",
    padding: 12,
    shadowColor: "#111713",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  chartPulse: {
    minHeight: 320,
    borderRadius: 16,
    backgroundColor: PAGE_BG,
  },

  /* Chart internals */
  chartTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  chartTitleText: { fontSize: 13, fontWeight: "900", color: INK },
  chartTouchWrap: { width: "100%", position: "relative" },
  chartTooltip: {
    position: "absolute",
    top: 6,
    backgroundColor: "#1E293B",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  chartTooltipDate: { color: "#94A3B8", fontSize: 10, fontWeight: "700" },
  chartTooltipPrice: { color: "#34D399", fontSize: 13, fontWeight: "900", marginTop: 1 },

  /* Dropdown */
  dropdownWrap: { position: "relative", zIndex: 30 },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 130,
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#e0e8e3",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dropdownButtonText: { fontSize: 13, fontWeight: "900", color: INK },
  dropdownMenu: {
    position: "absolute",
    top: 44,
    left: 0,
    minWidth: 150,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e0e8e3",
    paddingVertical: 4,
    zIndex: 50,
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
  dropdownItemActive: { backgroundColor: GREEN_SOFT },
  dropdownItemText: { fontSize: 13, fontWeight: "700", color: INK },
  dropdownItemTextActive: { color: GREEN, fontWeight: "900" },
});
