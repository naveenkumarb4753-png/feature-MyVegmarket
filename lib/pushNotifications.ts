import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

const CHANNEL_ID = "shipments";
const MAP_KEY = "mv_prebook_os_notif_v1";

type NotificationsModule = typeof import("expo-notifications");

let notifications: NotificationsModule | null = null;
let loadAttempted = false;
let unavailableReason: string | null = null;

/**
 * Expo Go on Android (SDK 53+) does not support remote push tokens and may
 * throw when expo-notifications native modules are accessed. Local scheduled
 * notifications work in a dev build (eas build / expo run:android) but are
 * unreliable in Expo Go — this module falls back gracefully in that case.
 *
 * Workaround: run `npx expo run:android` or `eas build --profile development`
 * so app.json expo-notifications plugin config is baked into the binary.
 * google-services.json is already referenced in app.json for FCM on release builds.
 *
 * Dev fix: Ctrl + C interrupt handles file watcher hooks cleanup on process exit.
 */
function isExpoGoAndroid() {
  return Platform.OS === "android" && Constants.executionEnvironment === "storeClient";
}

function isNotificationsUnavailable() {
  return Platform.OS === "web" || isExpoGoAndroid();
}

async function loadNotifications() {
  if (isNotificationsUnavailable()) {
    if (!unavailableReason) {
      unavailableReason = isExpoGoAndroid()
        ? "Expo Go on Android — use a dev build for OS notifications"
        : "web platform";
      console.info(`[pushNotifications] skipped: ${unavailableReason}`);
    }
    return null;
  }

  if (notifications) return notifications;
  if (loadAttempted) return null;
  loadAttempted = true;

  try {
    notifications = await import("expo-notifications");
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowAlert: true,
      }),
    });
    return notifications;
  } catch (err) {
    unavailableReason =
      err instanceof Error ? err.message : "expo-notifications unavailable";
    console.warn("[pushNotifications] module load failed:", unavailableReason);
    return null;
  }
}

async function readMap() {
  try {
    const raw = await AsyncStorage.getItem(MAP_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

async function writeMap(map: Record<string, string>) {
  await AsyncStorage.setItem(MAP_KEY, JSON.stringify(map));
}

export async function ensurePushPermissions() {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: "Shipment updates",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#1B7C41",
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      const asked = await Notifications.requestPermissionsAsync();
      status = asked.status;
    }
    return status === "granted";
  } catch (err) {
    console.warn("[pushNotifications] permission request failed:", err);
    return false;
  }
}

export async function notifyShipmentNowLive(id: string, title: string) {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;
  const granted = await ensurePushPermissions();
  if (!granted) return false;

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: `live-${id}`,
      content: {
        title: "Now available",
        body: `${title} is now live in View Ads.`,
        data: { id, type: "prebook-live" },
        sound: true,
      },
      trigger: null,
    });
    return true;
  } catch (err) {
    console.warn("[pushNotifications] notifyShipmentNowLive failed:", err);
    return false;
  }
}

export async function schedulePreBookNotification(
  id: string,
  title: string,
  availabilityDate?: string | null
) {
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  const granted = await ensurePushPermissions();
  if (!granted) return;

  try {
    await cancelPreBookNotification(id);

    const when = availabilityDate ? new Date(availabilityDate) : null;
    const validFuture =
      when && !Number.isNaN(when.getTime()) && when.getTime() > Date.now() + 15_000;

    const trigger: import("expo-notifications").NotificationTriggerInput = validFuture
      ? {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: when,
        }
      : null;

    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: validFuture ? "Arriving soon is now live" : "Pre-booked shipment",
        body: validFuture
          ? `${title} is now available in View Ads.`
          : `${title} is saved. We will notify you when it is live.`,
        data: { id, type: "prebook-live" },
        sound: true,
      },
      trigger,
    });

    const map = await readMap();
    map[id] = notifId;
    await writeMap(map);
  } catch (err) {
    console.warn("[pushNotifications] schedulePreBookNotification failed:", err);
  }
}

export type WishlistNotifyDetails = {
  productId: string;
  origin?: string | null;
  location?: string | null;
  priceLabel?: string;
  containerLabel?: string | null;
};

export async function notifyAdminWishlist(
  userEmail: string,
  productTitle: string,
  details?: WishlistNotifyDetails
) {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;
  const granted = await ensurePushPermissions();
  if (!granted) return false;

  const meta = [
    details?.origin,
    details?.location,
    details?.priceLabel,
    details?.containerLabel,
  ]
    .filter(Boolean)
    .join(" • ");

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: `admin-wish-${details?.productId ?? Date.now()}`,
      content: {
        title: "New wishlist request",
        body: meta
          ? `${userEmail} wishlisted "${productTitle}" (${meta}) — approval pending.`
          : `${userEmail} wishlisted "${productTitle}" — approval pending.`,
        data: {
          type: "admin-wishlist",
          userEmail,
          productTitle,
          productId: details?.productId ?? null,
          origin: details?.origin ?? null,
          location: details?.location ?? null,
          priceLabel: details?.priceLabel ?? null,
        },
        sound: true,
      },
      trigger: null,
    });
    return true;
  } catch (err) {
    console.warn("[pushNotifications] notifyAdminWishlist failed:", err);
    return false;
  }
}

export async function notifyAdminInquiry(
  userEmail: string,
  productTitle: string,
  message: string
) {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;
  const granted = await ensurePushPermissions();
  if (!granted) return false;

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: `admin-inq-${Date.now()}`,
      content: {
        title: "New customer inquiry",
        body: `${userEmail}: ${productTitle} — ${message.slice(0, 80)}`,
        data: { type: "admin-inquiry", userEmail, productTitle },
        sound: true,
      },
      trigger: null,
    });
    return true;
  } catch (err) {
    console.warn("[pushNotifications] notifyAdminInquiry failed:", err);
    return false;
  }
}

export async function cancelPreBookNotification(id: string) {
  const Notifications = await loadNotifications();
  if (!Notifications) return;

  try {
    const map = await readMap();
    const notifId = map[id];
    if (notifId) {
      await Notifications.cancelScheduledNotificationAsync(notifId);
      delete map[id];
      await writeMap(map);
    }
  } catch (err) {
    console.warn("[pushNotifications] cancelPreBookNotification failed:", err);
  }
}
