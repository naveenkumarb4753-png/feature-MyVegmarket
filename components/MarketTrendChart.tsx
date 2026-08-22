import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  TREND_RANGES,
  type TrendRangeKey,
  type TVPoint,
  normalizeForTrendRange,
} from "@/lib/alAweerInsights";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export type MarketTrendChartProps = {
  series: TVPoint[];
  width?: number;
  productName: string;
  height?: number;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
};

const VIEW_MODES = ["AREA", "LINE"] as const;
type ViewMode = (typeof VIEW_MODES)[number];

const CHART_PAD_L = 54;
const CHART_PAD_R = 14;
const CHART_PAD_T = 16;
const CHART_PAD_B = 32;
const DEFAULT_CHART_HEIGHT = 320;
const MIN_ZOOM = 0.8;
const MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.25;

function formatDateShort(time: string): string {
  const dt = new Date(time);
  if (Number.isNaN(dt.getTime())) return time.slice(0, 10);
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function shortLabel(time: string, range: TrendRangeKey): string {
  const dt = new Date(time);
  if (Number.isNaN(dt.getTime())) return time.slice(0, 10);
  if (range === "1D" || range === "1W" || range === "1M") {
    return String(dt.getDate());
  }
  return dt.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export default function MarketTrendChart({
  series,
  width = SCREEN_WIDTH - 48,
  productName,
  height = DEFAULT_CHART_HEIGHT,
  onInteractionStart,
  onInteractionEnd,
}: MarketTrendChartProps) {
  const [range, setRange] = useState<TrendRangeKey>("1M");
  const [viewMode, setViewMode] = useState<ViewMode>("AREA");
  const chartSeries = useMemo(() => normalizeForTrendRange(range, series), [range, series]);

  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isInteracting, setIsInteracting] = useState(false);

  const zoomLevelRef = useRef(zoomLevel);
  zoomLevelRef.current = zoomLevel;

  const svgWidth = width;
  const plotW = Math.max(svgWidth - CHART_PAD_L - CHART_PAD_R, 10);
  const plotH = height - CHART_PAD_T - CHART_PAD_B;

  const { min, max, priceRange } = useMemo(() => {
    if (!chartSeries.length) return { min: 0, max: 1, priceRange: 1 };
    const values = chartSeries.map((p) => p.value);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const span = hi - lo || Math.max(hi * 0.08, 1);
    return {
      min: lo - span * 0.06,
      max: hi + span * 0.06,
      priceRange: (hi - lo) * 1.12 || 1,
    };
  }, [chartSeries]);

  const xAt = useCallback(
    (i: number) => {
      const effectiveW = plotW * zoomLevel;
      const offsetX = chartSeries.length > 1 ? -(effectiveW - plotW) / 2 : 0;
      return CHART_PAD_L + offsetX + (i / Math.max(chartSeries.length - 1, 1)) * effectiveW;
    },
    [chartSeries.length, plotW, zoomLevel]
  );

  const yAt = useCallback(
    (v: number) => {
      const ratio = (v - min) / priceRange;
      return CHART_PAD_T + (1 - ratio) * plotH;
    },
    [min, priceRange, plotH]
  );

  const linePath = useMemo(() => {
    if (!chartSeries.length) return "";
    return chartSeries
      .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(2)} ${yAt(p.value).toFixed(2)}`)
      .join(" ");
  }, [chartSeries, xAt, yAt]);

  const areaPath = useMemo(() => {
    if (!chartSeries.length || viewMode !== "AREA") return "";
    const lastX = xAt(chartSeries.length - 1);
    return `${linePath} L ${lastX.toFixed(2)} ${(CHART_PAD_T + plotH).toFixed(2)} L ${xAt(0).toFixed(2)} ${(CHART_PAD_T + plotH).toFixed(2)} Z`;
  }, [chartSeries, linePath, plotH, viewMode, xAt]);

  const handleTouch = useCallback(
    (locationX: number) => {
      if (chartSeries.length < 2) {
        setActiveIdx(chartSeries.length ? 0 : null);
        return;
      }
      const ratio = (locationX - CHART_PAD_L) / plotW;
      const idx = Math.round(Math.max(0, Math.min(1, ratio)) * (chartSeries.length - 1));
      setActiveIdx(idx);
    },
    [chartSeries, plotW]
  );

  const active = activeIdx != null && chartSeries[activeIdx] ? chartSeries[activeIdx] : null;
  const tooltipLeft =
    activeIdx != null
      ? Math.max(4, Math.min(xAt(activeIdx) - 72, svgWidth - 150))
      : 0;

  const xTicks = useMemo(() => {
    if (chartSeries.length <= 1) return [0];
    const tickCount = Math.min(6, chartSeries.length);
    return Array.from({ length: tickCount }, (_, k) =>
      Math.round((k / (tickCount - 1)) * (chartSeries.length - 1))
    );
  }, [chartSeries]);

  const scrollRef = useRef<ScrollView>(null);

  const notifyInteractionStart = useCallback(() => {
    setIsInteracting(true);
    onInteractionStart?.();
  }, [onInteractionStart]);

  const notifyInteractionEnd = useCallback(() => {
    setIsInteracting(false);
    onInteractionEnd?.();
  }, [onInteractionEnd]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          runOnJS(notifyInteractionStart)();
        })
        .onUpdate((e: { x: number }) => {
          runOnJS(handleTouch)(e.x);
        })
        .onFinalize(() => {
          runOnJS(notifyInteractionEnd)();
        }),
    [notifyInteractionEnd, notifyInteractionStart, handleTouch]
  );

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onBegin(() => {
          runOnJS(notifyInteractionStart)();
        })
        .onUpdate((e: { scale: number }) => {
          const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomLevelRef.current * e.scale));
          runOnJS(setZoomLevel)(newZoom);
        })
        .onFinalize(() => {
          runOnJS(notifyInteractionEnd)();
        }),
    [notifyInteractionEnd, notifyInteractionStart, setZoomLevel]
  );

  const composedGesture = useMemo(
    () => Gesture.Race(pinchGesture, panGesture),
    [panGesture, pinchGesture]
  );

  const handleZoomIn = useCallback(() => {
    setZoomLevel((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(1);
  }, []);

  const handleRangeChange = useCallback((next: TrendRangeKey) => {
    setRange(next);
    setActiveIdx(null);
    setZoomLevel(1);
  }, []);

  const chartInteractionContainerStyle = useAnimatedStyle(() => {
    const opacity = withTiming(isInteracting ? 0.98 : 1, { duration: 150 });
    return { opacity };
  });

  return (
    <View style={styles.cardContainer}>
      {/* Chart Header */}
      <View style={styles.topRow}>
        <View>
          <View style={styles.titleRow}>
            <Ionicons name="stats-chart-outline" size={16} color="#0A8A3A" />
            <Text style={styles.titleText} numberOfLines={1}>
              {productName} - Market Price Trend
            </Text>
          </View>
          {active ? (
            <View style={styles.hudRow}>
              <View style={styles.hudItem}>
                <Text style={styles.hudLabel}>Price</Text>
                <Text style={styles.hudValue}>AED {active.value.toFixed(2)}</Text>
              </View>
              <View style={styles.hudItem}>
                <Text style={styles.hudLabel}>Date</Text>
                <Text style={styles.hudValue}>{formatDateShort(active.time)}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* View mode toggle */}
        <View style={styles.viewModeRow}>
          {VIEW_MODES.map((mode) => (
            <Pressable
              key={mode}
              style={[styles.viewModePill, viewMode === mode && styles.viewModePillActive]}
              onPress={() => setViewMode(mode)}
            >
              <Text style={[styles.viewModeText, viewMode === mode && styles.viewModeTextActive]}>
                {mode}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Timeframe selector */}
      <View style={styles.timeFrameRow}>
        {TREND_RANGES.map((item) => {
          const active = item.key === range;
          return (
            <Pressable
              key={item.key}
              style={[styles.tfPill, active && styles.tfPillActive]}
              onPress={() => handleRangeChange(item.key)}
            >
              <Text style={[styles.tfText, active && styles.tfTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Zoom controls */}
      <View style={styles.zoomControlsRow}>
        <Pressable style={styles.zoomBtn} onPress={handleZoomOut} hitSlop={4}>
          <Ionicons name="remove-outline" size={14} color="#374151" />
        </Pressable>
        <Text style={styles.zoomLevelText}>{Math.round(zoomLevel * 100)}%</Text>
        <Pressable style={styles.zoomBtn} onPress={handleZoomIn} hitSlop={4}>
          <Ionicons name="add-outline" size={14} color="#374151" />
        </Pressable>
        {zoomLevel !== 1 ? (
          <Pressable style={styles.zoomBtnReset} onPress={handleZoomReset} hitSlop={4}>
            <Ionicons name="refresh-outline" size={11} color="#0A8A3A" />
          </Pressable>
        ) : null}
      </View>

      {/* Interactive Chart */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View
          style={[
            styles.chartInteractionContainer,
            chartInteractionContainerStyle,
            Platform.select({ web: { touchAction: "none" } as object }),
          ]}
        >
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
            bounces
            scrollEnabled={!isInteracting}
            contentContainerStyle={{ paddingVertical: 4 }}
          >
            <Svg width={svgWidth} height={height}>
              {/* Gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                const y = CHART_PAD_T + pct * plotH;
                const priceVal = max - pct * priceRange;
                return (
                  <React.Fragment key={`grid-${i}`}>
                    <Line
                      x1={CHART_PAD_L}
                      y1={y}
                      x2={svgWidth - CHART_PAD_R}
                      y2={y}
                      stroke="#E5E7EB"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                    />
                    <SvgText
                      x={CHART_PAD_L - 6}
                      y={y + 3}
                      fill="#9AA6AF"
                      fontSize="9"
                      fontWeight="600"
                      textAnchor="end"
                    >
                      {priceVal.toFixed(priceVal >= 100 ? 0 : 1)}
                    </SvgText>
                  </React.Fragment>
                );
              })}

              {/* Area fill */}
              {areaPath ? <Path d={areaPath} fill="url(#trendAreaFill)" /> : null}
              {/* Line */}
              {linePath ? (
                <Path
                  d={linePath}
                  fill="none"
                  stroke="#1db954"
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ) : null}

              {/* Active crosshair / point */}
              {activeIdx != null && chartSeries[activeIdx] ? (
                <>
                  <Line
                    x1={xAt(activeIdx)}
                    y1={CHART_PAD_T}
                    x2={xAt(activeIdx)}
                    y2={CHART_PAD_T + plotH}
                    stroke="#9CA3AF"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                  <Circle
                    cx={xAt(activeIdx)}
                    cy={yAt(chartSeries[activeIdx].value)}
                    r={4.5}
                    fill="#1db954"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                </>
              ) : null}

              {/* X-axis ticks */}
              {xTicks.map((idx) => (
                <SvgText
                  key={`xtick-${idx}`}
                  x={xAt(idx)}
                  y={height - 8}
                  fill="#9AA6AF"
                  fontSize="9"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {shortLabel(chartSeries[idx].time, range)}
                </SvgText>
              ))}
            </Svg>
          </ScrollView>

          {/* Tooltip */}
          {active ? (
            <View style={[styles.chartTooltip, { left: tooltipLeft }]}>
              <Text style={styles.chartTooltipDate}>{formatDateShort(active.time)}</Text>
              <Text style={styles.chartTooltipPrice}>AED {active.value.toFixed(2)}</Text>
            </View>
          ) : null}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E8F5EC",
    shadowColor: "#0D1B12",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 16,
  },
  placeholderContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    gap: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: "#E8FFF0",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0D1B12",
    marginTop: 6,
  },
  placeholderSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  viewTrendButton: {
    marginTop: 10,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#0A8A3A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
    shadowColor: "#0A8A3A",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  viewTrendButtonText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "900",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  titleText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0D1B12",
    flex: 1,
  },
  hudRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
  },
  hudItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  hudLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  hudValue: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0D1B12",
  },
  viewModeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewModePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  viewModePillActive: {
    backgroundColor: "#0A8A3A",
    borderColor: "#0A8A3A",
  },
  viewModeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
  },
  viewModeTextActive: {
    color: "#FFFFFF",
  },
  timeFrameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    marginBottom: 10,
  },
  tfPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tfPillActive: {
    backgroundColor: "#0A8A3A",
    borderColor: "#0A8A3A",
  },
  tfText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
  },
  tfTextActive: {
    color: "#FFFFFF",
  },
  zoomControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  zoomBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  zoomLevelText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#475569",
    paddingHorizontal: 4,
    minWidth: 36,
    textAlign: "center",
  },
  zoomBtnReset: {
    width: 22,
    height: 22,
    borderRadius: 5,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },
  chartInteractionContainer: {
    width: "100%",
    position: "relative",
  },
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
    zIndex: 20,
  },
  chartTooltipDate: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 2,
  },
  chartTooltipPrice: {
    color: "#34D399",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 1,
  },
});
