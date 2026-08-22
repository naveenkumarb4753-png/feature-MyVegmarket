import AnimatedPressable from "@/components/AnimatedPressable";
import { BRAND } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import React, { memo, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

type Props = {
  variant?: "empty" | "error";
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
};

const FloatingAccent = memo(function FloatingAccent({
  name,
  size,
  color,
  style,
  delay,
}: {
  name: keyof typeof Ionicons.glyphMap;
  size: number;
  color: string;
  style: object;
  delay: number;
}) {
  const float = useSharedValue(0);

  useEffect(() => {
    float.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-4, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(4, { duration: 1200, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, [float, delay]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }],
  }));

  return (
    <Animated.View style={[style, animStyle]}>
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
});

export default function EmptyState({
  variant = "empty",
  title,
  subtitle,
  actionLabel,
  onAction,
  icon,
}: Props) {
  const isError = variant === "error";
  const mainIcon = icon ?? (isError ? "cloud-offline-outline" : "basket-outline");

  return (
    <Animated.View entering={FadeInUp.duration(400)} style={styles.wrap}>
      <View style={[styles.illus, isError && styles.illusError]}>
        <View style={[styles.ring, isError && styles.ringError]} />
        <Ionicons
          name={mainIcon}
          size={44}
          color={isError ? BRAND.danger : BRAND.primary}
        />
        <FloatingAccent
          name="leaf"
          size={16}
          color={BRAND.accent}
          style={styles.leafAccent}
          delay={0}
        />
        {!isError ? (
          <FloatingAccent
            name="nutrition"
            size={14}
            color={BRAND.primary}
            style={styles.vegAccent}
            delay={400}
          />
        ) : null}
      </View>

      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      {actionLabel && onAction ? (
        <AnimatedPressable style={styles.btn} onPress={onAction}>
          <Text style={styles.btnText}>{actionLabel}</Text>
        </AnimatedPressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 24 },
  illus: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: BRAND.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    position: "relative",
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  illusError: { backgroundColor: "#FEE2E2", borderColor: "#FECACA" },
  ring: {
    position: "absolute",
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 2,
    borderColor: BRAND.border,
    opacity: 0.5,
  },
  ringError: { borderColor: "#FECACA" },
  leafAccent: { position: "absolute", bottom: 12, right: 16 },
  vegAccent: { position: "absolute", top: 14, left: 18 },
  title: { fontSize: 18, fontWeight: "800", color: BRAND.text, textAlign: "center" },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: BRAND.muted,
    textAlign: "center",
    lineHeight: 21,
    fontWeight: "600",
    maxWidth: 300,
  },
  btn: {
    marginTop: 20,
    backgroundColor: BRAND.primary,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 13,
    shadowColor: BRAND.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  btnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
});
