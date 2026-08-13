import { BRAND } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

const SEARCH_TEXTS = ["fruits", "vegetables", "shipments", "Al Aweer prices", "importers"];
let globalSearchIndex = 0;

type Props = {
  value?: string;
  onChangeText?: (text: string) => void;
  onClear?: () => void;
  interactive?: boolean; // if false, tapping opens /search screen
  placeholderPrefix?: string;
};

export default function GlobalSearchBar({
  value,
  onChangeText,
  onClear,
  interactive = false,
  placeholderPrefix = "Search for",
}: Props) {
  const router = useRouter();
  const [searchText, setSearchText] = useState(SEARCH_TEXTS[globalSearchIndex]);
  const searchFade = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (value && value.length > 0) return;

    timerRef.current = setInterval(() => {
      Animated.timing(searchFade, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
        globalSearchIndex = (globalSearchIndex + 1) % SEARCH_TEXTS.length;
        setSearchText(SEARCH_TEXTS[globalSearchIndex]);
        Animated.timing(searchFade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      });
    }, 2800);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [searchFade, value]);

  if (!interactive) {
    return (
      <Pressable
        style={styles.searchBox}
        onPress={() => router.push("/search" as Href)}
        accessibilityRole="search"
        accessibilityLabel="Global Search"
      >
        <Ionicons name="search" size={18} color={BRAND.muted} />
        <Animated.Text style={[styles.searchPlaceholder, { opacity: searchFade }]} numberOfLines={1}>
          {placeholderPrefix} {searchText}…
        </Animated.Text>
        <View style={styles.searchMic}>
          <Ionicons name="mic-outline" size={16} color={BRAND.primary} />
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.searchBox}>
      <Ionicons name="search" size={18} color={BRAND.muted} />
      <View style={styles.inputContainer}>
        {(!value || value.length === 0) ? (
          <Animated.Text style={[styles.inputPlaceholder, { opacity: searchFade }]} pointerEvents="none">
            {placeholderPrefix} {searchText}…
          </Animated.Text>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={styles.input}
          placeholderTextColor="transparent"
        />
      </View>
      {value && value.length > 0 ? (
        <Pressable onPress={onClear} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color="#CBD5E1" />
        </Pressable>
      ) : (
        <View style={styles.searchMic}>
          <Ionicons name="mic-outline" size={16} color={BRAND.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: BRAND.borderLight,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: BRAND.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  inputContainer: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
  },
  inputPlaceholder: {
    position: "absolute",
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: BRAND.text,
    padding: 0,
  },
  searchMic: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(15,157,58,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
});
