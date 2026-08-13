import { BRAND } from "@/constants/colors";
import { useAppSession } from "@/lib/appSession";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, usePathname, useRouter, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PRIMARY = BRAND.primary;

type Glyph = keyof typeof Ionicons.glyphMap;

type TabItem = {
  key: string;
  label: string;
  icon: Glyph;
  iconFilled: Glyph;
  onPress: () => void;
};

function CustomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const session = useAppSession();

  const active = pathname.includes("containers")
    ? "ads"
    : pathname.includes("prices")
      ? "prices"
      : pathname.includes("post-ad")
        ? "post"
        : pathname.includes("account") || pathname.includes("exporter-auth")
          ? "account"
          : "home";

  const items: TabItem[] = [
    {
      key: "home",
      label: "Home",
      icon: "home-outline",
      iconFilled: "home",
      onPress: () => router.push("/(tabs)" as Href),
    },
    {
      key: "ads",
      label: "View Ads",
      icon: "storefront-outline",
      iconFilled: "storefront",
      onPress: () => router.push("/(tabs)/containers" as Href),
    },
    {
      key: "prices",
      label: "Prices",
      icon: "bar-chart-outline",
      iconFilled: "bar-chart",
      onPress: () => router.push("/(tabs)/prices" as Href),
    },
    {
      key: "post",
      label: "Post Ad",
      icon: "add" as Glyph,
      iconFilled: "add" as Glyph,
      onPress: session.goPostAd,
    },
    {
      key: "account",
      label: "Account",
      icon: "person-circle-outline",
      iconFilled: "person-circle",
      onPress: session.goAccount,
    },
  ];

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          minHeight: 60 + Math.max(insets.bottom, 8),
        },
      ]}
    >
      {items.map((item) => {
        const isPost = item.key === "post";
        const isActive = active === item.key;

        if (isPost) {
          return (
            <Pressable
              key={item.key}
              style={styles.postWrap}
              onPress={item.onPress}
              android_ripple={{ color: "rgba(10,138,58,0.12)", radius: 28 }}
            >
              <View style={styles.postBtn}>
                <Ionicons name="add" size={26} color="#FFFFFF" />
              </View>
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={item.key}
            style={styles.item}
            onPress={item.onPress}
            android_ripple={{ color: "rgba(10,138,58,0.1)", radius: 26 }}
          >
            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              <Ionicons
                name={isActive ? item.iconFilled : item.icon}
                size={22}
                color={isActive ? PRIMARY : "#9CA3AF"}
              />
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={() => <CustomTabBar />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: "#9CA3AF",
        headerTransparent: true,
        headerStyle: { backgroundColor: "rgba(255,255,255,0.92)" },
        headerTitleStyle: { color: PRIMARY, fontWeight: "800" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="containers"
        options={{
          title: "View Ads",
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? "storefront" : "storefront-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="prices"
        options={{
          title: "Prices",
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? "bar-chart" : "bar-chart-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="post-ad"
        options={{
          title: "Post Ad",
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? "add-circle" : "add-circle-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? "person-circle" : "person-circle-outline"} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: BRAND.borderLight,
    paddingTop: 8,
    // Elevated shadow
    shadowColor: BRAND.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  item: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    paddingBottom: 2,
  },
  iconWrap: {
    width: 44,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  iconWrapActive: {
    backgroundColor: "rgba(15, 157, 58, 0.12)",
  },
  postWrap: {
    flex: 1,
    alignItems: "center",
    marginTop: -20,
    gap: 3,
  },
  postBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY,
    shadowOpacity: 0.38,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
  },
  labelActive: {
    color: PRIMARY,
    fontWeight: "900",
  },
});
