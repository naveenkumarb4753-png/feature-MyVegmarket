import { BRAND } from "@/constants/colors";
import React, { memo, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

type VeggieKey = "tomato" | "carrot" | "leaf" | "eggplant" | "chili" | "grapes";

const VEGGIES: VeggieKey[] = ["tomato", "carrot", "leaf", "eggplant", "chili", "grapes"];

const WITTY_LINES: Record<string, string[]> = {
  default: [
    "Washing the veggies… metaphorically.",
    "Convincing tomatoes they're ripe enough.",
    "Negotiating with cucumbers for freshness.",
    "Asking the market what today's mood is.",
    "Sprinkling a little market magic…",
  ],
  prices: [
    "Counting dirhams at Al Aweer…",
    "Checking if onions made anyone cry today.",
    "The market whispered — prices incoming.",
    "Weighing grapes with extra care.",
  ],
  ads: [
    "Tracking containers across oceans…",
    "Polishing grapes until they sparkle.",
    "Matching buyers with the perfect shipment.",
    "Scanning the docks for fresh arrivals.",
  ],
  containers: [
    "Unlocking shipment details…",
    "Checking container freshness levels.",
    "Following the cold chain trail…",
  ],
  auth: [
    "Rolling out the red carpet for you.",
    "Preparing your dashboard throne.",
    "Polishing your exporter badge…",
  ],
  search: [
    "Hunting for the freshest listings…",
    "Sifting through crates of possibilities.",
    "Almost there — smell the mangoes?",
  ],
};

type Props = {
  context?: keyof typeof WITTY_LINES | "default";
  label?: string;
  /** Optional context-aware message; witty lines still rotate beneath */
  message?: string;
};

// One shared, continuous oscillation drives a travelling "wave" across the icons.
// A single linear clock (0 → 1, looping) keeps the motion perfectly fluid — no
// discrete jumps — while a per-icon phase offset produces the wave.
const WAVE_MS = 1500;
const AMPLITUDE = 9;

function VeggieSvg({ kind, size = 26 }: { kind: VeggieKey; size?: number }) {
  switch (kind) {
    case "tomato":
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32">
          <Path d="M16 8 L13 4 M16 8 L19 4 M16 8 L16 3" stroke="#2E9E4F" strokeWidth={2} strokeLinecap="round" />
          <Circle cx={16} cy={19} r={10} fill="#E4443B" />
          <Ellipse cx={12.5} cy={15.5} rx={2.4} ry={1.5} fill="#F58A84" opacity={0.7} />
        </Svg>
      );
    case "carrot":
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32">
          <Path d="M16 8 L11 3 M16 8 L16 2 M16 8 L21 3" stroke="#2E9E4F" strokeWidth={2} strokeLinecap="round" />
          <Path d="M16 9 L24 12 L16 30 L8 12 Z" fill="#EF7A1A" />
          <Path d="M12 15 H20 M13 20 H19 M14 24 H18" stroke="#C85E0C" strokeWidth={1.2} strokeLinecap="round" />
        </Svg>
      );
    case "leaf":
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32">
          <Path d="M6 26 C6 12 18 6 27 6 C27 20 16 26 6 26 Z" fill="#2E9E4F" />
          <Path d="M9 24 C14 18 20 13 25 9" stroke="#1B7C3A" strokeWidth={1.6} strokeLinecap="round" fill="none" />
        </Svg>
      );
    case "eggplant":
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32">
          <Path d="M18 6 C15 4 12 5 12 8 C10 7 8 8 9 10" stroke="#2E9E4F" strokeWidth={2} strokeLinecap="round" fill="none" />
          <Path d="M22 11 C26 15 25 24 18 27 C10 30 5 22 9 15 C12 10 18 8 22 11 Z" fill="#7A3EA6" />
          <Ellipse cx={14} cy={17} rx={2} ry={3} fill="#B98AD6" opacity={0.6} />
        </Svg>
      );
    case "chili":
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32">
          <Path d="M11 6 C13 8 15 8 17 8" stroke="#2E9E4F" strokeWidth={2} strokeLinecap="round" fill="none" />
          <Path d="M16 8 C24 9 27 17 22 24 C19 28 14 27 15 22 C16 17 13 12 16 8 Z" fill="#D6362E" />
        </Svg>
      );
    case "grapes":
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32">
          <Rect x={15} y={3} width={2} height={5} rx={1} fill="#8A5A2B" />
          <Path d="M17 6 C21 4 24 6 23 9" stroke="#2E9E4F" strokeWidth={2} strokeLinecap="round" fill="none" />
          <G fill="#7A3EA6">
            <Circle cx={13} cy={12} r={3} />
            <Circle cx={19} cy={12} r={3} />
            <Circle cx={16} cy={16} r={3} />
            <Circle cx={11} cy={17} r={3} />
            <Circle cx={21} cy={17} r={3} />
            <Circle cx={16} cy={22} r={3} />
          </G>
        </Svg>
      );
    default:
      return null;
  }
}

const VegIcon = memo(function VegIcon({
  kind,
  index,
  total,
}: {
  kind: VeggieKey;
  index: number;
  total: number;
}) {
  const clock = useSharedValue(0);

  useEffect(() => {
    clock.value = withRepeat(withTiming(1, { duration: WAVE_MS, easing: Easing.linear }), -1, false);
  }, [clock]);

  const phase = (index / total) * Math.PI * 2;

  const style = useAnimatedStyle(() => {
    const angle = clock.value * Math.PI * 2 + phase;
    const wave = Math.sin(angle);
    return {
      transform: [
        { translateY: wave * AMPLITUDE },
        { rotate: `${wave * 7}deg` },
        { scale: 1 + Math.cos(angle) * 0.05 },
      ],
    };
  });

  return (
    <Animated.View style={[styles.vegIcon, style]}>
      <VeggieSvg kind={kind} />
    </Animated.View>
  );
});

export default function VegLoader({ context = "default", label, message }: Props) {
  const lines = WITTY_LINES[context] ?? WITTY_LINES.default;
  const [lineIdx, setLineIdx] = useState(0);

  const witty = useMemo(() => lines[lineIdx % lines.length], [lineIdx, lines]);

  useEffect(() => {
    const id = setInterval(() => setLineIdx((i) => i + 1), 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={styles.wrap} accessibilityRole="progressbar">
      <View style={styles.canvas}>
        <View style={styles.row}>
          {VEGGIES.map((kind, i) => (
            <VegIcon key={`${kind}-${i}`} kind={kind} index={i} total={VEGGIES.length} />
          ))}
        </View>
      </View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Animated.Text key={witty} entering={FadeInDown.duration(280)} style={styles.witty}>
        {witty}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    width: "100%",
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    padding: 24,
    gap: 10,
  },
  canvas: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 6, height: 44 },
  vegIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 16, fontWeight: "800", color: BRAND.text },
  message: {
    fontSize: 14,
    fontWeight: "700",
    color: BRAND.primaryDark,
    textAlign: "center",
    maxWidth: 300,
  },
  witty: {
    fontSize: 13,
    fontWeight: "600",
    color: BRAND.muted,
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 280,
    fontStyle: "italic",
  },
});
