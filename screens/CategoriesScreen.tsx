import { BRAND, CATEGORY_COLORS } from "@/constants/colors";
import { HD_IMAGES, GREEN, categoryAccent } from "@/lib/produceUi";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useNavigation, useRouter, type Href } from "expo-router";
import { safeBack } from "@/lib/nav";
import ProduceImage from "@/components/ProduceImage";
import React, { useLayoutEffect } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type CategoryRow = {
  key: string;
  title: string;
  subtitle: string;
  image: string;
  href: Href;
  accentColor: string;
  bgColor: string;
  tag?: string;
};

const CATEGORIES: CategoryRow[] = [
  {
    key: "all",
    title: "All Shipments",
    subtitle: "Browse every live container ad",
    image: HD_IMAGES.hero,
    href: "/(tabs)/containers",
    accentColor: BRAND.primary,
    bgColor: BRAND.primaryLight,
    tag: "Live",
  },
  {
    key: "fruits",
    title: "Fresh Fruits",
    subtitle: "Grapes, oranges, apples & more",
    image: HD_IMAGES.fruits,
    href: { pathname: "/search", params: { q: "Fruits" } },
    accentColor: CATEGORY_COLORS.fruits.accent,
    bgColor: CATEGORY_COLORS.fruits.bg,
  },
  {
    key: "vegetables",
    title: "Vegetables",
    subtitle: "Tomatoes, peppers, cucumbers & more",
    image: HD_IMAGES.vegetables,
    href: { pathname: "/search", params: { q: "Vegetables" } },
    accentColor: CATEGORY_COLORS.vegetables.accent,
    bgColor: CATEGORY_COLORS.vegetables.bg,
  },
  {
    key: "spices",
    title: "Spices & Herbs",
    subtitle: "Ground spices, herbs & blends",
    image: HD_IMAGES.spices,
    href: { pathname: "/search", params: { q: "Spices" } },
    accentColor: CATEGORY_COLORS.spices.accent,
    bgColor: CATEGORY_COLORS.spices.bg,
  },
  {
    key: "nuts",
    title: "Nuts & Dry Fruits",
    subtitle: "Premium dry fruits & mixed nuts",
    image: HD_IMAGES.nuts,
    href: { pathname: "/search", params: { q: "Nuts & Dry Fruits" } },
    accentColor: CATEGORY_COLORS.nuts.accent,
    bgColor: CATEGORY_COLORS.nuts.bg,
  },
  {
    key: "herbs",
    title: "Fresh Herbs",
    subtitle: "Mint, parsley, cilantro & basil",
    image: HD_IMAGES.herbs,
    href: { pathname: "/search", params: { q: "Fresh Herbs" } },
    accentColor: CATEGORY_COLORS.herbs.accent,
    bgColor: CATEGORY_COLORS.herbs.bg,
  },
  {
    key: "eggs",
    title: "Eggs",
    subtitle: "Farm-fresh eggs & egg products",
    image: HD_IMAGES.eggs,
    href: { pathname: "/search", params: { q: "Eggs" } },
    accentColor: CATEGORY_COLORS.eggs.accent,
    bgColor: CATEGORY_COLORS.eggs.bg,
  },
  {
    key: "oils",
    title: "Oils & Fats",
    subtitle: "Olive, sunflower, vegetable oils",
    image: HD_IMAGES.oils,
    href: { pathname: "/search", params: { q: "Oils" } },
    accentColor: CATEGORY_COLORS.oils.accent,
    bgColor: CATEGORY_COLORS.oils.bg,
  },
  {
    key: "other",
    title: "Other Produce",
    subtitle: "Beans, grains & specialty goods",
    image: HD_IMAGES.beans,
    href: { pathname: "/search", params: { q: "Other" } },
    accentColor: BRAND.primary,
    bgColor: BRAND.primaryLight,
  },
];

export default function CategoriesScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false, tabBarStyle: { display: "none" } });
    const parent = navigation.getParent();
    parent?.setOptions?.({ tabBarStyle: { display: "none" } });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false, animation: "slide_from_right" }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => safeBack(router, "/(tabs)")}
          style={styles.iconBtn}
          hitSlop={12}
          accessibilityLabel="Go back"
        >
          <View style={styles.backBtnInner}>
            <Ionicons name="arrow-back" size={20} color={BRAND.text} />
          </View>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Categories</Text>
          <Text style={styles.subtitle}>{CATEGORIES.length} categories available</Text>
        </View>
        <Pressable
          onPress={() => router.push("/search" as Href)}
          style={styles.iconBtn}
          hitSlop={12}
          accessibilityLabel="Search"
        >
          <View style={styles.searchBtnInner}>
            <Ionicons name="search-outline" size={18} color="#111827" />
          </View>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat.key}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => router.push(cat.href)}
            accessibilityRole="button"
            accessibilityLabel={cat.title}
          >
            {/* Left color accent strip */}
            <View style={[styles.accentStrip, { backgroundColor: cat.accentColor }]} />

            {/* Image */}
            <View style={[styles.thumbWrap, { backgroundColor: cat.bgColor }]}>
              <ProduceImage
                title={cat.title}
                category={cat.key}
                imageUrl={cat.image}
                style={styles.thumb}
              />
            </View>

            {/* Text */}
            <View style={styles.copy}>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle}>{cat.title}</Text>
                {cat.tag ? (
                  <View style={[styles.tagPill, { backgroundColor: cat.accentColor }]}>
                    <Text style={styles.tagText}>{cat.tag}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.cardSub}>{cat.subtitle}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.pageBg },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: BRAND.borderLight,
  },
  headerCenter: { flex: 1, alignItems: "center" },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backBtnInner: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: BRAND.pageBg,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnInner: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: BRAND.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    color: BRAND.muted,
    fontWeight: "600",
    marginTop: 1,
  },

  // List
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 10,
  },

  // Cards
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BRAND.borderLight,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: BRAND.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardPressed: {
    backgroundColor: BRAND.pageBg,
    transform: [{ scale: 0.985 }],
  },
  accentStrip: {
    width: 4,
    alignSelf: "stretch",
  },
  thumbWrap: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumb: { width: "100%", height: "100%" },
  copy: { flex: 1, paddingVertical: 14, paddingLeft: 12, paddingRight: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: BRAND.text,
    letterSpacing: -0.2,
  },
  tagPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  cardSub: {
    marginTop: 3,
    fontSize: 12,
    color: BRAND.muted,
    fontWeight: "500",
  },
});
