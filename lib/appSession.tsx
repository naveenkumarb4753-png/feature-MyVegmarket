import { getExporterSession } from "@/lib/exporterAuth";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, type Href } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type UserRole = "buyer" | "seller";

export type WishlistAd = {
  id: string;
  title: string;
  origin?: string | null;
  location?: string | null;
  priceLabel?: string;
  imageUrl?: string | null;
  containerLabel?: string | null;
};

type AppSessionValue = {
  ready: boolean;
  isLoggedIn: boolean;
  email: string | null;
  role: UserRole | null;
  intendedRole: UserRole | null;
  wishlist: WishlistAd[];
  preBookedIds: string[];
  notifiedIds: string[];
  wishlistOpen: boolean;
  pendingAd: string | null;
  pendingProductId: string | null;
  setWishlistOpen: (open: boolean) => void;
  setIntendedRole: (role: UserRole | null) => void;
  setRole: (role: UserRole | null) => void;
  refreshSession: () => Promise<boolean>;
  markLoggedIn: (email: string, role?: UserRole | null) => Promise<void>;
  logout: () => Promise<void>;
  isWishlisted: (id: string) => boolean;
  isWishlistPending: (id: string) => boolean;
  toggleWishlist: (ad: WishlistAd) => void;
  isPreBooked: (id: string) => boolean;
  togglePreBook: (id: string, title?: string, availabilityDate?: string | null) => void;
  markNotified: (id: string) => void;
  openAdInsights: (itemJson: string) => void;
  openPriceInsights: (productId: string) => void;
  goPostAd: () => void;
  goAccount: () => void;
  consumePendingNavigation: () => Promise<{ ad: string | null; productId: string | null }>;
};

const ROLE_KEY = "mv_user_role_v1";
const INTENDED_ROLE_KEY = "mv_intended_role_v1";
const WISHLIST_KEY = "mv_wishlist_v1";
const PREBOOK_KEY = "mv_prebook_v1";
const NOTIFIED_KEY = "mv_prebook_notified_v1";
const PENDING_AD_KEY = "mv_pending_ad_v1";
const PENDING_PRODUCT_KEY = "mv_pending_product_v1";

const AppSessionContext = createContext<AppSessionValue | null>(null);

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function AppSessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [intendedRole, setIntendedRoleState] = useState<UserRole | null>(null);
  const [wishlist, setWishlist] = useState<WishlistAd[]>([]);
  const [preBookedIds, setPreBookedIds] = useState<string[]>([]);
  const [notifiedIds, setNotifiedIds] = useState<string[]>([]);
  const [wishlistOpen, setWishlistOpenState] = useState(false);
  const [pendingAd, setPendingAd] = useState<string | null>(null);
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);

  const persist = useCallback(async (key: string, value: unknown) => {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  }, []);

  const refreshSession = useCallback(async () => {
    const session = await getExporterSession();
    const nextEmail = session?.email ?? null;
    setEmail(nextEmail);

    const storedRole = await readJson<UserRole | null>(ROLE_KEY, null);
    const storedIntent = await readJson<UserRole | null>(INTENDED_ROLE_KEY, null);
    setRoleState(storedRole);
    setIntendedRoleState(storedIntent);
    setPendingAd(await readJson<string | null>(PENDING_AD_KEY, null));
    setPendingProductId(await readJson<string | null>(PENDING_PRODUCT_KEY, null));

    if (nextEmail) {
      setWishlist(await readJson<WishlistAd[]>(WISHLIST_KEY, []));
      setPreBookedIds(await readJson<string[]>(PREBOOK_KEY, []));
      setNotifiedIds(await readJson<string[]>(NOTIFIED_KEY, []));
    } else {
      setWishlist([]);
      setWishlistOpenState(false);
    }

    return !!nextEmail;
  }, []);

  useEffect(() => {
    refreshSession().finally(() => setReady(true));
  }, [refreshSession]);

  useEffect(() => {
    if (!email) return;
    void import("@/lib/pushNotifications").then(({ ensurePushPermissions }) => {
      void ensurePushPermissions();
    });
  }, [email]);

  const setIntendedRole = useCallback(
    async (next: UserRole | null) => {
      setIntendedRoleState(next);
      await persist(INTENDED_ROLE_KEY, next);
    },
    [persist]
  );

  const setRole = useCallback(
    async (next: UserRole | null) => {
      setRoleState(next);
      await persist(ROLE_KEY, next);
    },
    [persist]
  );

  const markLoggedIn = useCallback(
    async (nextEmail: string, nextRole?: UserRole | null) => {
      setEmail(nextEmail);
      const applied = nextRole ?? intendedRole ?? "buyer";
      await setRole(applied);
      await refreshSession();
    },
    [intendedRole, refreshSession, setRole]
  );

  const logout = useCallback(async () => {
    const { clearExporterSession } = await import("@/lib/exporterAuth");
    await clearExporterSession();
    setEmail(null);
    setWishlistOpenState(false);
    setWishlist([]);
    await persist(ROLE_KEY, null);
    setRoleState(null);
  }, [persist]);

  const setWishlistOpen = useCallback(
    (open: boolean) => {
      if (!email) {
        setWishlistOpenState(false);
        return;
      }
      setWishlistOpenState(open);
    },
    [email]
  );

  const isWishlisted = useCallback(
    (id: string) => !!email && wishlist.some((item) => item.id === id),
    [email, wishlist]
  );

  const isWishlistPending = useCallback(
    (_id: string) => false,
    []
  );

  const toggleWishlist = useCallback(
    (ad: WishlistAd) => {
      if (!email) return;
      setWishlist((prev) => {
        const exists = prev.some((item) => item.id === ad.id);
        const next = exists ? prev.filter((item) => item.id !== ad.id) : [ad, ...prev];
        void persist(WISHLIST_KEY, next);
        if (!exists) {
          void import("@/lib/pushNotifications").then(({ notifyAdminWishlist }) => {
            void notifyAdminWishlist(email, ad.title, {
              productId: ad.id,
              origin: ad.origin,
              location: ad.location,
              priceLabel: ad.priceLabel,
              containerLabel: ad.containerLabel,
            });
          });
        }
        return next;
      });
    },
    [email, persist]
  );

  const isPreBooked = useCallback(
    (id: string) => preBookedIds.includes(id),
    [preBookedIds]
  );

  const togglePreBook = useCallback(
    (id: string, title?: string, availabilityDate?: string | null) => {
      if (!email) return;
      setPreBookedIds((prev) => {
        const exists = prev.includes(id);
        const next = exists ? prev.filter((item) => item !== id) : [id, ...prev];
        persist(PREBOOK_KEY, next);
        void (async () => {
          const {
            cancelPreBookNotification,
            schedulePreBookNotification,
          } = await import("@/lib/pushNotifications");
          if (exists) {
            await cancelPreBookNotification(id);
            return;
          }
          await schedulePreBookNotification(
            id,
            title || "This shipment",
            availabilityDate
          );
        })();
        return next;
      });
    },
    [email, persist]
  );

  const markNotified = useCallback(
    (id: string) => {
      setNotifiedIds((prev) => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        persist(NOTIFIED_KEY, next);
        return next;
      });
    },
    [persist]
  );

  const openAdInsights = useCallback(
    (itemJson: string) => {
      setIntendedRole("buyer");
      persist(PENDING_AD_KEY, itemJson);
      setPendingAd(itemJson);

      if (!email) {
        router.push("/(tabs)/account" as Href);
        return;
      }

      router.push({
        pathname: "/container-details",
        params: { item: itemJson },
      } as Href);
    },
    [email, persist, router, setIntendedRole]
  );

  const openPriceInsights = useCallback(
    (productId: string) => {
      setIntendedRole("buyer");
      persist(PENDING_PRODUCT_KEY, productId);
      setPendingProductId(productId);

      if (!email) {
        router.push("/(tabs)/account" as Href);
        return;
      }

      router.push({
        pathname: "/product-insight",
        params: { id: productId },
      } as Href);
    },
    [email, persist, router, setIntendedRole]
  );

  const goPostAd = useCallback(() => {
    setIntendedRole("seller");
    if (!email) {
      router.push("/(tabs)/account" as Href);
      return;
    }
    router.push("/(tabs)/post-ad" as Href);
  }, [email, router, setIntendedRole]);

  const goAccount = useCallback(() => {
    router.push("/(tabs)/account" as Href);
  }, [router]);

  const consumePendingNavigation = useCallback(async () => {
    const ad = pendingAd;
    const productId = pendingProductId;
    setPendingAd(null);
    setPendingProductId(null);
    await AsyncStorage.removeItem(PENDING_AD_KEY);
    await AsyncStorage.removeItem(PENDING_PRODUCT_KEY);
    return { ad, productId };
  }, [pendingAd, pendingProductId]);

  const value = useMemo<AppSessionValue>(
    () => ({
      ready,
      isLoggedIn: !!email,
      email,
      role,
      intendedRole,
      wishlist,
      preBookedIds,
      notifiedIds,
      wishlistOpen,
      pendingAd,
      pendingProductId,
      setWishlistOpen,
      setIntendedRole,
      setRole,
      refreshSession,
      markLoggedIn,
      logout,
      isWishlisted,
      isWishlistPending,
      toggleWishlist,
      isPreBooked,
      togglePreBook,
      markNotified,
      openAdInsights,
      openPriceInsights,
      goPostAd,
      goAccount,
      consumePendingNavigation,
    }),
    [
      ready,
      email,
      role,
      intendedRole,
      wishlist,
      preBookedIds,
      notifiedIds,
      wishlistOpen,
      pendingAd,
      pendingProductId,
      setWishlistOpen,
      setIntendedRole,
      setRole,
      refreshSession,
      markLoggedIn,
      logout,
      isWishlisted,
      isWishlistPending,
      toggleWishlist,
      isPreBooked,
      togglePreBook,
      markNotified,
      openAdInsights,
      openPriceInsights,
      goPostAd,
      goAccount,
      consumePendingNavigation,
    ]
  );

  return (
    <AppSessionContext.Provider value={value}>
      {children}
      <WishlistDrawer />
    </AppSessionContext.Provider>
  );
}

export function useAppSession() {
  const ctx = useContext(AppSessionContext);
  if (!ctx) {
    throw new Error("useAppSession must be used within AppSessionProvider");
  }
  return ctx;
}

function WishlistDrawer() {
  const session = useContext(AppSessionContext);
  const insets = useSafeAreaInsets();
  if (!session?.isLoggedIn) return null;

  return (
    <Modal
      visible={session.wishlistOpen}
      animationType="slide"
      transparent
      onRequestClose={() => session.setWishlistOpen(false)}
    >
      <View style={drawerStyles.backdrop}>
        <Pressable style={drawerStyles.flex} onPress={() => session.setWishlistOpen(false)} />
        <View style={[drawerStyles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={drawerStyles.handle} />

          {/* Header */}
          <View style={drawerStyles.header}>
            <View style={drawerStyles.headerLeft}>
              <View style={drawerStyles.heartIconWrap}>
                <Ionicons name="star" size={18} color="#E11D48" />
              </View>
              <View>
                <Text style={drawerStyles.title}>My Wishlist</Text>
                <Text style={drawerStyles.subtitle}>{session.wishlist.length} saved shipments</Text>
              </View>
            </View>
            <Pressable onPress={() => session.setWishlistOpen(false)} hitSlop={12} style={drawerStyles.closeBtn}>
              <Ionicons name="close" size={18} color="#374151" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 14 }}>
            {session.wishlist.length === 0 ? (
              <View style={drawerStyles.emptyWrap}>
                <Ionicons name="star-outline" size={40} color="#D1D5DB" />
                <Text style={drawerStyles.empty}>No saved shipments yet.</Text>
                <Text style={drawerStyles.emptySub}>Tap ♥ on any listing to save it here.</Text>
              </View>
            ) : (
              session.wishlist.map((item) => (
                <Pressable
                  key={item.id}
                  style={drawerStyles.row}
                  onPress={() => {
                    session.setWishlistOpen(false);
                    session.openAdInsights(JSON.stringify(item));
                  }}
                >
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={drawerStyles.thumb} />
                  ) : (
                    <View style={drawerStyles.thumbFallback}>
                      <Ionicons name="leaf" size={18} color="#0A8A3A" />
                    </View>
                  )}
                  <View style={drawerStyles.rowText}>
                    <Text style={drawerStyles.rowTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={drawerStyles.rowMeta} numberOfLines={1}>
                      {[item.priceLabel, item.containerLabel, item.origin]
                        .filter(Boolean)
                        .join(" • ")}
                    </Text>
                    {item.location ? (
                      <Text style={drawerStyles.rowLocation}>
                        <Ionicons name="location-outline" size={11} color="#6B7280" /> {item.location}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => session.toggleWishlist(item)}
                    hitSlop={12}
                    style={drawerStyles.removeBtn}
                  >
                    <Ionicons name="star" size={18} color="#E11D48" />
                  </Pressable>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const drawerStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(13,27,18,0.48)",
    justifyContent: "flex-end",
  },
  flex: { flex: 1 },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: "82%",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 99,
    backgroundColor: "#E5E7EB",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  heartIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "900", color: "#0D1B12" },
  subtitle: { fontSize: 12, color: "#6B7280", fontWeight: "600", marginTop: 1 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: { alignItems: "center", paddingVertical: 40, gap: 10 },
  empty: { fontSize: 15, fontWeight: "700", color: "#374151", textAlign: "center" },
  emptySub: { fontSize: 13, color: "#6B7280", textAlign: "center", fontWeight: "500" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 12,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 14, fontWeight: "800", color: "#0D1B12" },
  rowMeta: { marginTop: 3, fontSize: 12, color: "#6B7280", fontWeight: "500" },
  rowLocation: { marginTop: 2, fontSize: 11, color: "#6B7280", fontWeight: "500" },
  thumb: { width: 52, height: 52, borderRadius: 14, backgroundColor: "#F3F4F6" },
  thumbFallback: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
  },
});
