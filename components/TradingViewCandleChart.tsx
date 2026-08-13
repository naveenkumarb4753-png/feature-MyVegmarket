import { BRAND } from "@/constants/colors";
import { InsightRange, INSIGHT_RANGES } from "@/lib/productInsights";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useRef, useState } from "react";
import {
  Dimensions,
  GestureResponderEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";

export type DualCandlePoint = {
  date: string;
  alAweerOpen: number;
  alAweerHigh: number;
  alAweerLow: number;
  alAweerClose: number;
  myVegOpen: number;
  myVegHigh: number;
  myVegLow: number;
  myVegClose: number;
};

export type TimeFrame = InsightRange;

type Props = {
  data: DualCandlePoint[];
  title?: string;
  initialTimeFrame?: TimeFrame;
  timeFrame?: TimeFrame;
  onTimeFrameChange?: (tf: TimeFrame) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  height?: number;
};

const TIMEFRAMES: TimeFrame[] = INSIGHT_RANGES;

function formatPriceAED(val: number) {
  return `${val.toFixed(2)} AED`;
}

export function formatDateDDMMYY(dateStr: string) {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("T")[0].split("-");
    if (parts.length === 3) {
      const year = parts[0].slice(-2);
      const month = parts[1].padStart(2, "0");
      const day = parts[2].padStart(2, "0");
      return `${day}/${month}/${year}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = String(d.getFullYear()).slice(-2);
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

function getDistance(touches: { pageX: number; pageY: number }[]) {
  const [a, b] = touches;
  if (!a || !b) return 0;
  const dx = a.pageX - b.pageX;
  const dy = a.pageY - b.pageY;
  return Math.sqrt(dx * dx + dy * dy);
}

export default function TradingViewCandleChart({
  data,
  title = "Price Chart Analysis Graph",
  initialTimeFrame = "1M",
  timeFrame: controlledTimeFrame,
  onTimeFrameChange,
  onInteractionStart,
  onInteractionEnd,
  height = 270,
}: Props) {
  const [internalTimeFrame, setInternalTimeFrame] = useState<TimeFrame>(initialTimeFrame);
  const activeTimeFrame = controlledTimeFrame || internalTimeFrame;
  const [zoomLevel, setZoomLevel] = useState<number>(1); // 0.6x to 2.5x
  const [selectedPoint, setSelectedPoint] = useState<DualCandlePoint | null>(null);

  // Multi-touch pinch tracking
  const lastPinchDist = useRef<number | null>(null);

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data;
  }, [data]);

  // Width for each pair of candles (Al Aweer Blue + MyVeg Green)
  const singleCandleWidth = 8 * zoomLevel;
  const pairGap = 10 * zoomLevel;
  const candleInnerGap = 2 * zoomLevel;
  const pairWidth = singleCandleWidth * 2 + candleInnerGap;

  const chartPaddingLeft = 45;
  const chartPaddingRight = 20;
  const chartHeaderH = 30;
  const chartFooterH = 30;
  const chartHeight = height - chartHeaderH - chartFooterH;

  const { minPrice, maxPrice, priceRange } = useMemo(() => {
    if (filteredData.length === 0) return { minPrice: 0, maxPrice: 10, priceRange: 10 };
    const lows: number[] = [];
    const highs: number[] = [];
    filteredData.forEach((d) => {
      lows.push(d.alAweerLow, d.myVegLow);
      highs.push(d.alAweerHigh, d.myVegHigh);
    });
    const minP = Math.min(...lows);
    const maxP = Math.max(...highs);
    const range = maxP - minP || 1;
    const pMin = Math.max(0, minP - range * 0.05);
    const pMax = maxP + range * 0.05;
    return { minPrice: pMin, maxPrice: pMax, priceRange: pMax - pMin || 1 };
  }, [filteredData]);

  const svgWidth = Math.max(
    Dimensions.get("window").width - 48,
    chartPaddingLeft + chartPaddingRight + filteredData.length * (pairWidth + pairGap)
  );

  const priceToY = (price: number) => {
    const ratio = (price - minPrice) / priceRange;
    return chartHeight - ratio * chartHeight + chartHeaderH;
  };

  const activePoint = selectedPoint || (filteredData.length > 0 ? filteredData[filteredData.length - 1] : null);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(2.5, +(z + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.6, +(z - 0.25).toFixed(2)));
  const handleZoomReset = () => setZoomLevel(1);

  return (
    <View style={styles.cardContainer}>
      {/* Chart Header & Legend */}
      <View style={styles.topRow}>
        <View>
          <View style={styles.titleRow}>
            <Ionicons name="stats-chart-outline" size={16} color={BRAND.primary} />
            <Text style={styles.titleText}>{title}</Text>
          </View>
          {activePoint ? (
            <View style={styles.hudRow}>
              <View style={styles.hudLegendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#2563EB" }]} />
                <Text style={styles.legendLabel}>Al-Aweer:</Text>
                <Text style={styles.hudPriceBlue}>{formatPriceAED(activePoint.alAweerClose)}</Text>
              </View>

              <View style={styles.hudLegendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#10B981" }]} />
                <Text style={styles.legendLabel}>MyVeg:</Text>
                <Text style={styles.hudPriceGreen}>{formatPriceAED(activePoint.myVegClose)}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>

      {/* Unified Toolbar Row: Timeframes on left, Zoom on right */}
      <View style={styles.toolbarRow}>
        <View style={styles.timeFrameRow}>
          {TIMEFRAMES.map((tf) => {
            const active = tf === activeTimeFrame;
            return (
              <Pressable
                key={tf}
                style={[styles.tfPill, active && styles.tfPillActive]}
                onPress={() => {
                  if (onTimeFrameChange) onTimeFrameChange(tf);
                  setInternalTimeFrame(tf);
                  setSelectedPoint(null);
                }}
              >
                <Text style={[styles.tfText, active && styles.tfTextActive]}>{tf}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Compact Zoom Toolbar Badge */}
        <View style={styles.zoomControlsRow}>
          <Pressable style={styles.zoomBtn} onPress={handleZoomOut} hitSlop={4}>
            <Ionicons name="remove-outline" size={13} color="#475569" />
          </Pressable>
          <Text style={styles.zoomLevelText}>{Math.round(zoomLevel * 100)}%</Text>
          <Pressable style={styles.zoomBtn} onPress={handleZoomIn} hitSlop={4}>
            <Ionicons name="add-outline" size={13} color="#475569" />
          </Pressable>
          {zoomLevel !== 1 ? (
            <Pressable style={styles.zoomBtnReset} onPress={handleZoomReset} hitSlop={4}>
              <Ionicons name="refresh-outline" size={11} color={BRAND.primary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Interactive Tooltip Popover on Candle Tap */}
      {selectedPoint ? (
        <View style={styles.tooltipBox}>
          <Text style={styles.tooltipDate}>{formatDateDDMMYY(selectedPoint.date)}</Text>
          <View style={styles.tooltipColumn}>
            <Text style={[styles.tooltipItem, { color: "#60A5FA" }]}>
              Al-Aweer Market: O {selectedPoint.alAweerOpen.toFixed(2)} | H {selectedPoint.alAweerHigh.toFixed(2)} | L {selectedPoint.alAweerLow.toFixed(2)} | C {selectedPoint.alAweerClose.toFixed(2)}
            </Text>
            <Text style={[styles.tooltipItem, { color: "#34D399" }]}>
              MyVeg Rate: O {selectedPoint.myVegOpen.toFixed(2)} | H {selectedPoint.myVegHigh.toFixed(2)} | L {selectedPoint.myVegLow.toFixed(2)} | C {selectedPoint.myVegClose.toFixed(2)}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Scrollable Candlestick Chart SVG Canvas — Sticky Y-Axis Overlay */}
      <View
        onTouchStart={() => {
          if (onInteractionStart) onInteractionStart();
        }}
        onTouchEnd={() => {
          if (onInteractionEnd) onInteractionEnd();
        }}
        onTouchCancel={() => {
          if (onInteractionEnd) onInteractionEnd();
        }}
        style={{ width: "100%", position: "relative" }}
      >
      {filteredData.length === 0 ? (
        <View style={styles.noDataBanner}>
          <Ionicons name="information-circle-outline" size={16} color="#92400E" />
          <Text style={styles.noDataText}>
            Not enough data for this timeframe. Try a wider range.
          </Text>
        </View>
      ) : (
      <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled={true}
        bounces={true}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: 6 }}
      >
        <Svg width={svgWidth} height={height}>
          {/* Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = chartHeaderH + pct * chartHeight;
            return (
              <Line
                key={`grid-${i}`}
                x1={chartPaddingLeft}
                y1={y}
                x2={svgWidth - chartPaddingRight}
                y2={y}
                stroke="#E5E7EB"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Render Dual Candles (Blue for Al Aweer, Green for MyVeg) */}
          {filteredData.map((d, index) => {
            const pairStartX = chartPaddingLeft + index * (pairWidth + pairGap);
            const isSelected = selectedPoint?.date === d.date;

            // Al Aweer Candle (Blue)
            const alX = pairStartX;
            const alCenterX = alX + singleCandleWidth / 2;
            const alOpenY = priceToY(d.alAweerOpen);
            const alCloseY = priceToY(d.alAweerClose);
            const alHighY = priceToY(d.alAweerHigh);
            const alLowY = priceToY(d.alAweerLow);
            const alBodyTop = Math.min(alOpenY, alCloseY);
            const alBodyH = Math.max(Math.abs(alCloseY - alOpenY), 3);

            // MyVeg Candle (Green)
            const myX = pairStartX + singleCandleWidth + candleInnerGap;
            const myCenterX = myX + singleCandleWidth / 2;
            const myOpenY = priceToY(d.myVegOpen);
            const myCloseY = priceToY(d.myVegClose);
            const myHighY = priceToY(d.myVegHigh);
            const myLowY = priceToY(d.myVegLow);
            const myBodyTop = Math.min(myOpenY, myCloseY);
            const myBodyH = Math.max(Math.abs(myCloseY - myOpenY), 3);

            return (
              <React.Fragment key={`dual-candle-${d.date}-${index}`}>
                {/* Al Aweer Wick (Blue #2563EB) */}
                <Line
                  x1={alCenterX}
                  y1={alHighY}
                  x2={alCenterX}
                  y2={alLowY}
                  stroke="#2563EB"
                  strokeWidth={1.5}
                />
                {/* Al Aweer Body (Blue #2563EB) */}
                <Rect
                  x={alX}
                  y={alBodyTop}
                  width={singleCandleWidth}
                  height={alBodyH}
                  fill="#2563EB"
                  rx={2}
                  stroke={isSelected ? "#1E293B" : "#2563EB"}
                  strokeWidth={isSelected ? 1.5 : 0}
                  onPress={() => setSelectedPoint(d)}
                />

                {/* MyVeg Wick (Green #10B981) */}
                <Line
                  x1={myCenterX}
                  y1={myHighY}
                  x2={myCenterX}
                  y2={myLowY}
                  stroke="#10B981"
                  strokeWidth={1.5}
                />
                {/* MyVeg Body (Green #10B981) */}
                <Rect
                  x={myX}
                  y={myBodyTop}
                  width={singleCandleWidth}
                  height={myBodyH}
                  fill="#10B981"
                  rx={2}
                  stroke={isSelected ? "#1E293B" : "#10B981"}
                  strokeWidth={isSelected ? 1.5 : 0}
                  onPress={() => setSelectedPoint(d)}
                />

                {/* Full-Height Column Touch Target Overlay for Instant HUD Update */}
                <Rect
                  x={pairStartX - pairGap / 2}
                  y={chartHeaderH}
                  width={pairWidth + pairGap}
                  height={chartHeight}
                  fill="transparent"
                  onPress={() => setSelectedPoint(d)}
                />

                {/* Date Label */}
                {index % Math.max(Math.floor(filteredData.length / 6), 1) === 0 ? (
                  <SvgText
                    x={pairStartX + pairWidth / 2}
                    y={height - 8}
                    fill="#9CA3AF"
                    fontSize="9"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {formatDateDDMMYY(d.date)}
                  </SvgText>
                ) : null}
              </React.Fragment>
            );
          })}
        </Svg>
      </ScrollView>

      {/* Sticky Y-Axis Overlay Container */}
      <View style={styles.stickyYAxisOverlay} pointerEvents="none">
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const priceVal = minPrice + (1 - pct) * priceRange;
          const y = chartHeaderH + pct * chartHeight;
          return (
            <View
              key={`sticky-y-${i}`}
              style={[styles.stickyYTick, { top: y + 2 }]}
            >
              <Text style={styles.stickyYText}>{priceVal.toFixed(1)}</Text>
            </View>
          );
        })}
      </View>
      </>
      )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: BRAND.borderLight,
    shadowColor: BRAND.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 16,
    ...Platform.select({
      web: { touchAction: "pan-x" } as object,
    }),
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  titleText: {
    fontSize: 14,
    fontWeight: "900",
    color: BRAND.text,
  },
  hudRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  hudLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: BRAND.muted,
  },
  hudPriceBlue: {
    fontSize: 13,
    fontWeight: "900",
    color: "#2563EB",
  },
  hudPriceGreen: {
    fontSize: 13,
    fontWeight: "900",
    color: "#10B981",
  },
  toolbarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  timeFrameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  tfPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tfPillActive: {
    backgroundColor: BRAND.primary,
    borderColor: BRAND.primary,
  },
  tfText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
  },
  tfTextActive: {
    color: "#FFFFFF",
  },
  tooltipBox: {
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
  },
  tooltipDate: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 2,
  },
  tooltipColumn: {
    gap: 2,
  },
  tooltipItem: {
    fontSize: 10,
    fontWeight: "800",
  },
  noDataBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  noDataText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#92400E",
    lineHeight: 17,
  },
  zoomControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  zoomBtn: {
    width: 22,
    height: 22,
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
  },
  zoomBtnReset: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 1,
  },
  stickyYAxisOverlay: {
    position: "absolute",
    left: 0,
    top: 6,
    bottom: 6,
    width: 44,
    backgroundColor: "transparent",
    zIndex: 10,
  },
  stickyYTick: {
    position: "absolute",
    left: 0,
    width: 42,
    alignItems: "flex-end",
    paddingRight: 4,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 3,
    paddingVertical: 1,
  },
  stickyYText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.2,
  },
});
