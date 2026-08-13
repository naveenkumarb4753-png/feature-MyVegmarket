"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  CrosshairMode,
  type BusinessDay,
  type UTCTimestamp,
} from "lightweight-charts";

export type TVPoint = { time: string; value: number }; // "YYYY-MM-DD"

type RangeKey = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "MAX";
type ViewMode = "MY" | "MARKET" | "COMPARE";

/** ✅ Chart baseline starts from January 2026 */
const CHART_START_DATE = "2026-01-01";

type Props = {
  title: string;
  myveg: TVPoint[];
  market?: TVPoint[];
  height?: number;
  range: RangeKey;
  onAvgTextChange?: (text: string) => void;
};

/** ---------- small helpers ---------- */
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function isISODateOnly(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function toUTCTimestampSeconds(timeStr: string): UTCTimestamp {
  // Supports YYYY-MM-DD and full ISO
  if (isISODateOnly(timeStr)) {
    // interpret as UTC midnight
    const [y, m, d] = timeStr.split("-").map(Number);
    const ms = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
    return Math.floor(ms / 1000) as UTCTimestamp;
  }

  const ms = new Date(timeStr).getTime();
  // fallback: if invalid, treat as now (prevents crashes)
  const safeMs = Number.isFinite(ms) ? ms : Date.now();
  return Math.floor(safeMs / 1000) as UTCTimestamp;
}
function parseBusinessDay(yyyy_mm_dd: string): BusinessDay {
  const [y, m, d] = yyyy_mm_dd.split("-").map(Number);
  return { year: y, month: m, day: d };
}

function toISODate(dt: Date) {
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return toISODate(dt);
}

function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setMonth(dt.getMonth() + months);
  // normalize to 1st day for month points
  return toISODate(new Date(dt.getFullYear(), dt.getMonth(), 1));
}

function startOfDayISO(dateStr: string) {
  // already YYYY-MM-DD, keep as is
  return dateStr.slice(0, 10);
}

function startOfMonthISO(dateStr: string) {
  const [y, m] = dateStr.slice(0, 7).split("-").map(Number);
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

function sortByTime(series: TVPoint[]) {
  return [...(series ?? [])].sort((a, b) => a.time.localeCompare(b.time));
}

function rangeToDays(r: RangeKey) {
  switch (r) {
    case "1D":
      return 1;
    case "1W":
      return 7;
    case "1M":
      return 30;
    default:
      return 30;
  }
}

function rangeToMonths(r: RangeKey) {
  switch (r) {
    case "3M":
      return 3;
    case "6M":
      return 6;
    case "1Y":
      return 12;
    default:
      return 0;
  }
}

/** ---------- build series for the selected range ---------- */
/**
 * ✅ Daily ranges -> daily points (fills missing days using carry-forward)
 * ✅ Monthly ranges -> 1 point per month (latest value in that month)
 *
 * IMPORTANT: For monthly ranges, we keep ALL months available (so dragging left/right works)
 */
function normalizeForRange(range: RangeKey, raw: TVPoint[]): TVPoint[] {
  const s = sortByTime(raw);
  if (!s.length) return [];

  const isDaily = range === "1D" || range === "1W" || range === "1M";

if (isDaily) {
  // ✅ Keep ALL intraday points (ISO timestamps), but still allow carry-forward gaps
  // If data is date-only, it will still work.
  const out: TVPoint[] = [];

  // First, keep all existing points (sorted)
  for (const p of s) out.push({ time: p.time, value: p.value });

  // If points are date-only (no time), we can still fill missing days
  // But if points are full ISO, filling every day with fake points would add noise,
  // so we only fill for date-only datasets.
  const dateOnly = s.every((p) => isISODateOnly(startOfDayISO(p.time)));

  if (!dateOnly) return out;

  const dayMap = new Map<string, number>();
  for (const p of s) dayMap.set(startOfDayISO(p.time), p.value);

  const first = startOfDayISO(s[0].time);
  const last = startOfDayISO(s[s.length - 1].time);

  const filled: TVPoint[] = [];
  let cur = first;
  let carry = dayMap.get(first) ?? s[0].value;

  for (let i = 0; i < 5000; i++) {
    const v = dayMap.get(cur);
    if (typeof v === "number") carry = v;
    filled.push({ time: cur, value: carry });
    if (cur === last) break;
    cur = addDays(cur, 1);
  }
  return filled;
}

  // Monthly (3M/6M/1Y/MAX) -> latest point per month
  const monthMap = new Map<string, TVPoint>(); // monthStart -> latest point
  for (const p of s) {
    const m0 = startOfMonthISO(p.time);
    const prev = monthMap.get(m0);
    if (!prev || prev.time < p.time) monthMap.set(m0, { time: m0, value: p.value });
  }

  // build continuous months from first month..last month so panning is smooth
  const firstMonth = startOfMonthISO(s[0].time);
  const lastMonth = startOfMonthISO(s[s.length - 1].time);

  const out: TVPoint[] = [];
  let cur = firstMonth;
  let carry = monthMap.get(cur)?.value ?? s[0].value;

  for (let i = 0; i < 240; i++) {
    const got = monthMap.get(cur);
    if (got) carry = got.value;
    out.push({ time: cur, value: carry });
    if (cur === lastMonth) break;
    cur = addMonths(cur, 1);
  }
  return out;
}

/** ---------- percentage mode ---------- */
function toPct(data: TVPoint[]) {
  if (!data.length) return data;
  const base = data[0].value || 1;
  return data.map((p) => ({
    time: p.time,
    value: ((p.value - base) / base) * 100,
  }));
}

/** ---------- avg calc helpers ---------- */
function buildIndex(series: TVPoint[]) {
  const t: number[] = [];
  const ps: number[] = [0];
  for (let i = 0; i < series.length; i++) {
    const ms = new Date(series[i].time).getTime();
    t.push(ms);
    ps.push(ps[i] + series[i].value);
  }
  return { t, ps };
}

function lowerBound(arr: number[], x: number) {
  let lo = 0,
    hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function upperBound(arr: number[], x: number) {
  let lo = 0,
    hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] <= x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function timeToMs(t: any): number | null {
  if (!t) return null;

  if (typeof t === "string") {
    const ms = new Date(t).getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  if (typeof t === "number") return t * 1000;

  if (typeof t === "object" && "year" in t && "month" in t && "day" in t) {
    const ms = Date.UTC(t.year, t.month - 1, t.day);
    return Number.isFinite(ms) ? ms : null;
  }

  return null;
}

function avgInRange(index: { t: number[]; ps: number[] }, from: any, to: any): number | null {
  const fromMs = timeToMs(from);
  const toMs = timeToMs(to);
  if (fromMs == null || toMs == null) return null;

  const loMs = Math.min(fromMs, toMs);
  const hiMs = Math.max(fromMs, toMs);

  const l = lowerBound(index.t, loMs);
  const r = upperBound(index.t, hiMs);
  const count = r - l;
  if (!count) return null;

  const sum = index.ps[r] - index.ps[l];
  return sum / count;
}

function formatAED(v: number) {
  if (!Number.isFinite(v)) return "-";
  return `AED ${v.toFixed(2)}`;
}

function formatPct(v: number) {
  if (!Number.isFinite(v)) return "-";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function formatTimePill(t: any) {
  if (!t) return "";
  if (typeof t === "object" && "year" in t && "month" in t && "day" in t) {
    const d = new Date(t.year, t.month - 1, t.day);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }
  if (typeof t === "number") {
    const d = new Date(t * 1000);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }
  if (typeof t === "string") return t;
  return String(t);
}

function timeToDate(time: any): Date {
  if (typeof time === "number") return new Date(time * 1000);
  if (typeof time === "string") return new Date(time);
  return new Date(time.year, (time.month ?? 1) - 1, time.day ?? 1);
}

/** ✅ Make labels never look “empty”: give each tick enough pixels */
function pxPerPoint(range: RangeKey) {
  if (range === "1W") return 90; // Mon Tue Wed...
  if (range === "1M") return 40; // 1..30
  if (range === "3M") return 140;
  if (range === "6M") return 110;
  if (range === "1Y") return 90;
  return 55; // MAX
}

function visiblePointCount(range: RangeKey) {
  if (range === "1D") return 1;
  if (range === "1W") return 7;
  if (range === "1M") return 30;
  if (range === "3M") return 3;
  if (range === "6M") return 6;
  if (range === "1Y") return 12;
  return 24; // MAX default visible
}

export default function ProductTrendTVChart({
  title,
  myveg,
  market,
  height = 430,
  range,
  onAvgTextChange,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const chartRef = useRef<IChartApi | null>(null);
  const myRef = useRef<ISeriesApi<"Line"> | null>(null);
  const marketRef = useRef<ISeriesApi<"Line"> | null>(null);

  const topLabelRef = useRef<HTMLDivElement | null>(null);
  const bottomTimeRef = useRef<HTMLDivElement | null>(null);

  const hasMy = (myveg ?? []).length > 0;
  const hasMk = (market ?? []).length > 0;
  const defaultView: ViewMode = hasMy && hasMk ? "COMPARE" : hasMk ? "MARKET" : "MY";

  const [view, setView] = useState<ViewMode>(defaultView);
  const [mode, setMode] = useState<"ABS" | "PCT">("ABS");

  /** ✅ 1) Normalize raw data to DAILY or MONTHLY based on range */
  const myAbs = useMemo(() => normalizeForRange(range, myveg ?? []), [range, myveg]);
  const mkAbs = useMemo(() => normalizeForRange(range, market ?? []), [range, market]);

  const mySeries = useMemo(() => (mode === "PCT" ? toPct(myAbs) : myAbs), [mode, myAbs]);
  const mkSeries = useMemo(() => (mode === "PCT" ? toPct(mkAbs) : mkAbs), [mode, mkAbs]);

  const myIdx = useMemo(() => buildIndex(myAbs), [myAbs]);
  const mkIdx = useMemo(() => buildIndex(mkAbs), [mkAbs]);

  const lastAvgTextRef = useRef<string>("");
  const rafRef = useRef<number | null>(null);

  /** ✅ chart width so ALL labels are visible, and wrapper becomes scrollable */
  const [chartWidth, setChartWidth] = useState<number | null>(null);

  const pushAvgText = () => {
    const chart = chartRef.current;
    if (!chart) return;

    const vr = chart.timeScale().getVisibleRange();
    if (!vr) return;

    const parts: string[] = [];
    if (view !== "MARKET" && myAbs.length) {
      const a = avgInRange(myIdx, vr.from, vr.to);
      parts.push(`MyVeg Avg: ${a == null ? "-" : formatAED(a)}`);
    }
    if (view !== "MY" && mkAbs.length) {
      const a = avgInRange(mkIdx, vr.from, vr.to);
      parts.push(`Market Avg: ${a == null ? "-" : formatAED(a)}`);
    }

    const text = parts.length ? parts.join("  •  ") : "Avg: -";
    if (text !== lastAvgTextRef.current) {
      lastAvgTextRef.current = text;
      onAvgTextChange?.(text);
    }
  };

  const scheduleAvg = () => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      pushAvgText();
    });
  };

  /** ✅ Dynamic x-axis label format (based on selected range) */
  const tickFormatter = useMemo(() => {
    return ((time: any) => {
      const d = timeToDate(time);

      if (range === "1W") {
        return d.toLocaleString("en-US", { weekday: "short" }); // Mon Tue...
      }

      if (range === "1D"  || range === "1M") {
        return String(d.getDate()); // 1..30/31
      }

      // 3M/6M/1Y/MAX -> month label
      const mon = d.toLocaleString("en-US", { month: "short" }); // Jan
      if (range === "1Y" || range === "MAX") {
        // show year on Jan for clarity
        if (d.getMonth() === 0) return `${mon} '${String(d.getFullYear()).slice(-2)}`;
      }
      return mon;
    }) as any;
  }, [range]);

  /** ✅ Create chart once */
  useEffect(() => {
    if (!containerRef.current || !wrapperRef.current) return;
    if (chartRef.current) return;

    const el = containerRef.current;

    const chart = createChart(el, {
      width: el.clientWidth || 900,
      height,

      layout: {
        background: { color: "transparent" },
        textColor: "rgba(17,23,19,0.88)",
        attributionLogo: false,
      },

      grid: {
        vertLines: { color: "rgba(0,0,0,0.05)" },
        horzLines: { color: "rgba(0,0,0,0.05)" },
      },

      rightPriceScale: {
        borderColor: "rgba(0,0,0,0.12)",
        ticksVisible: true,
      },
timeScale: {
  borderColor: "rgba(0,0,0,0.12)",
  borderVisible: true,

  // ✅ must be on
  visible: true,
  ticksVisible: true,

  timeVisible: true,
  secondsVisible: false,

  // ✅ allow real panning
  fixLeftEdge: false,
  fixRightEdge: false,
  rightOffset: 2,

  // ✅ IMPORTANT: don’t “stick” to right edge when dragging
  rightBarStaysOnScroll: false,

  // ✅ helps prevent label skipping too aggressively
  barSpacing: 22,
  minBarSpacing: 10,

  tickMarkFormatter: tickFormatter,
} as any,

      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { visible: true, labelVisible: false, width: 1, style: 2, color: "rgba(0,0,0,0.35)" },
        horzLine: { visible: false, labelVisible: false },
      },

      /** ✅ Drag left/right (this is your “horizontal scroll”) */
      handleScroll: {
        pressedMouseMove: true,
        mouseWheel: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },

      handleScale: { axisPressedMouseMove: false, mouseWheel: true, pinch: true },
    });

    chartRef.current = chart;

    myRef.current = chart.addSeries(LineSeries, {
      lineWidth: 2,
      color: "rgba(29,185,84,0.95)",
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
    });

    const onResize = () => {
      if (!chartRef.current || !containerRef.current) return;
      const parentW = containerRef.current.parentElement?.clientWidth || containerRef.current.clientWidth || 900;
      try {
        // @ts-ignore
        chartRef.current.resize(parentW, height);
      } catch {}
      scheduleAvg();
    };
    window.addEventListener("resize", onResize);

    const onVisibleRangeChange = () => scheduleAvg();
    chart.timeScale().subscribeVisibleTimeRangeChange(onVisibleRangeChange);

    chart.subscribeCrosshairMove((param) => {
      const top = topLabelRef.current;
      const bottom = bottomTimeRef.current;
      const wrap = wrapperRef.current;
      if (!top || !bottom || !wrap) return;

      if (!param?.time || !param.point) {
        top.style.opacity = "0";
        bottom.style.opacity = "0";
        return;
      }

      const myS = myRef.current;
      const mkS = marketRef.current;

      const myVal = myS ? (param.seriesData.get(myS) as any)?.value : undefined;
      const mkVal = mkS ? (param.seriesData.get(mkS) as any)?.value : undefined;

      const fmt = (v: any) => {
        const num = Number(v);
        if (!Number.isFinite(num)) return "-";
        return mode === "PCT" ? formatPct(num) : formatAED(num);
      };

      const parts: string[] = [];
      if (view !== "MARKET" && myAbs.length) parts.push(`MyVeg: ${fmt(myVal)}`);
      if (view !== "MY" && mkS && mkAbs.length) parts.push(`Market: ${fmt(mkVal)}`);

      top.textContent = parts.join("  |  ");
      top.style.opacity = "1";

      const wrapRect = wrap.getBoundingClientRect();
      const pillWidth = 180;
      const left = clamp(param.point.x - pillWidth / 2, 8, wrapRect.width - pillWidth - 8);

      bottom.textContent = formatTimePill(param.time);
      bottom.style.transform = `translateX(${left}px)`;
      bottom.style.opacity = "1";
    });

    return () => {
      window.removeEventListener("resize", onResize);
      try {
        chart.timeScale().unsubscribeVisibleTimeRangeChange(onVisibleRangeChange);
      } catch {}
      try {
        chart.remove();
      } catch {}
      chartRef.current = null;
      myRef.current = null;
      marketRef.current = null;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height]);

  /** ✅ Apply tick formatter whenever range changes */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.applyOptions({
      timeScale: { tickMarkFormatter: tickFormatter } as any,
    });
  }, [tickFormatter]);

  /** ✅ Apply AED labels on Y-axis (and % when mode changes) */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    chart.applyOptions({
      localization: {
        priceFormatter: (price: number) => (mode === "PCT" ? formatPct(price) : formatAED(price)),
      },
    });
  }, [mode]);

  /** ✅ Update series data */
  useEffect(() => {
    const chart = chartRef.current;
    const myS = myRef.current;
    if (!chart || !myS) return;

    myS.setData(mySeries as any);
    try {
      myS.applyOptions({ visible: view !== "MARKET" && myAbs.length > 0 });
    } catch {}

    const needMarket = view !== "MY" && mkSeries?.length;

    if (needMarket) {
      if (!marketRef.current) {
        marketRef.current = chart.addSeries(LineSeries, {
          lineWidth: 2,
          color: "rgba(37,99,235,0.95)",
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 4,
        });
      }
      marketRef.current.setData(mkSeries as any);
    } else {
      if (marketRef.current) {
        try {
          chart.removeSeries(marketRef.current);
        } catch {}
        marketRef.current = null;
      }
    }

    scheduleAvg();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mySeries, mkSeries, view, myAbs.length]);

  /**
   * ✅ IMPORTANT:
   * 1) Set chart width so ALL labels appear (Mon..Sun / 1..30 / Jan..Dec)
   * 2) Wrapper will become horizontally scrollable (overflow-x-auto)
   */
  useEffect(() => {
    const chart = chartRef.current;
    const el = containerRef.current;
    if (!chart || !el) return;

    const parentW = el.parentElement?.clientWidth || el.clientWidth || 900;
    const count = visiblePointCount(range);
    const wanted = Math.max(parentW, count * pxPerPoint(range));

    setChartWidth(wanted);

    try {
      // @ts-ignore
      chart.resize(wanted, height);
    } catch {}

    scheduleAvg();
  }, [range, height]);

  /**
   * ✅ On range change: show last N days/months, BUT allow dragging left/right across full dataset.
   * This gives you exactly: Jan visible -> drag right -> Feb -> Mar, etc.
   */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const base = mkSeries.length ? mkSeries : mySeries;
    if (!base.length) return;

    // MAX: show all
    if (range === "MAX") {
      try {
        chart.timeScale().fitContent();
      } catch {}
      scheduleAvg();
      return;
    }

    // Daily ranges
    if (range === "1D" || range === "1W" || range === "1M") {
      const days = rangeToDays(range);
      const last = base[base.length - 1].time;
      const first = addDays(last, -(days - 1));

      try {
        chart.timeScale().setVisibleRange({
          from: parseBusinessDay(first),
          to: parseBusinessDay(last),
        });
      } catch {
        try {
          chart.timeScale().fitContent();
        } catch {}
      }

      scheduleAvg();
      return;
    }

    // Monthly ranges (3M/6M/1Y)
    const months = rangeToMonths(range);
    const last = base[base.length - 1].time; // YYYY-MM-01
    const first = addMonths(last, -(months - 1)); // month-01

    try {
      chart.timeScale().setVisibleRange({
        from: parseBusinessDay(first),
        to: parseBusinessDay(last),
      });
    } catch {
      try {
        chart.timeScale().fitContent();
      } catch {}
    }

    scheduleAvg();
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [range, mySeries.length, mkSeries.length]);

  useEffect(() => {
    scheduleAvg();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, view]);

  const showViewControls = hasMy && hasMk;

  return (
    <div className="h-full w-full flex flex-col min-w-0">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3 min-w-0">
        <div className="min-w-0">
          <div className="text-[#111713] font-black truncate">{title}</div>
          <div className="text-sm text-[#648770] font-medium">Drag left/right to explore more dates.</div>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1 md:overflow-visible md:flex-wrap md:pb-0 md:mx-0 md:px-0">
          {showViewControls ? (
            [
              { k: "MY", label: "MyVeg" },
              { k: "MARKET", label: "Market" },
              { k: "COMPARE", label: "Compare" },
            ].map((b) => (
              <button
                key={b.k}
                onClick={() => setView(b.k as ViewMode)}
                className={[
                  "shrink-0 px-3 py-2 rounded-full text-sm font-black border transition",
                  view === b.k
                    ? "bg-[#111713] text-white border-[#111713]"
                    : "bg-white text-[#111713] border-[#e0e8e3] hover:bg-[#f6f8f7]",
                ].join(" ")}
              >
                {b.label}
              </button>
            ))
          ) : (
            <span className="shrink-0 px-3 py-2 rounded-full text-sm font-black border border-[#e0e8e3] bg-white text-[#111713]">
              Market
            </span>
          )}

          <button
            onClick={() => setMode((m) => (m === "ABS" ? "PCT" : "ABS"))}
            className="shrink-0 px-3 py-2 rounded-full text-sm font-black border border-[#e0e8e3] bg-white hover:bg-[#f6f8f7]"
          >
            {mode === "ABS" ? "Price (AED)" : "% Change"}
          </button>
        </div>
      </div>

      {/* ✅ wrapper is now horizontally scrollable */}
     <div ref={wrapperRef} className="relative w-full select-none overflow-x-hidden overflow-y-visible rounded-2xl">
        <div
          ref={topLabelRef}
          className="absolute left-3 top-3 z-10 rounded-lg bg-white/95 border border-black/10 px-3 py-2 text-[#111713] shadow-md text-sm font-black"
          style={{
            opacity: 0,
            pointerEvents: "none",
            maxWidth: "calc(100% - 24px)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        />

        <div
          ref={bottomTimeRef}
          className="absolute bottom-2 z-10 rounded-md bg-[#111713] text-white px-3 py-1 text-xs font-black shadow-md"
          style={{ opacity: 0, pointerEvents: "none", width: 180 }}
        />

        {/* ✅ chart canvas widened so labels show fully */}
       <div ref={containerRef} className="w-full" style={{ height }} />
      </div>
    </div>
  );
}