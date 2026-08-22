import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/lib/supabase";
import {
  clearExporterSession,
  loginExporter,
  signupExporter,
} from "@/lib/exporterAuth";
import { useAppSession } from "@/lib/appSession";
import { isVerifiedAdmin } from "@/lib/rolesMobile";
import { planDisplayName, readPlanTier } from "@/lib/subscriptionPlan";
import { BRAND } from "@/constants/colors";
import AnimatedPressable from "@/components/AnimatedPressable";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SUPPORT_PHONE = "7010220771";
const SUPPORT_EMAIL = "support@myvegmarket.com";

export default function ExporterAuthScreen() {
  const router = useRouter();
  const session = useAppSession();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [planName, setPlanName] = useState("Free Tier");

  // Edit Profile modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editLicense, setEditLicense] = useState("");
  const [changePasswordActive, setChangePasswordActive] = useState(false);
  const [editPassword, setEditPassword] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<string | null>(null);

  async function pickProfileImage() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setNotice("Permission to access photos is required.");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!res.canceled && res.assets[0]?.uri) {
        setEditAvatar(res.assets[0].uri);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function saveProfile() {
    setBusy(true);
    setUsernameStatus(null);
    try {
      const cleanUser = editUsername.trim().toLowerCase();
      if (cleanUser && cleanUser !== (username || "").toLowerCase()) {
        // Query database for username availability
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", cleanUser)
          .maybeSingle();

        if (existing) {
          setUsernameStatus("Username is already taken by another user.");
          setBusy(false);
          return;
        }
      }

      if (cleanUser) setUsername(cleanUser);
      if (editAvatar) setAvatarUrl(editAvatar);
      if (editCompany.trim()) setCompanyName(editCompany.trim());
      if (editLicense.trim()) setLicenseNumber(editLicense.trim());

      setShowEditModal(false);
      setNotice("Profile details updated successfully!");
    } catch (err: any) {
      setNotice(err?.message || "Could not update profile.");
    } finally {
      setBusy(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      session.refreshSession();
      readPlanTier().then((t) => setPlanName(planDisplayName(t)));
    }, [session.refreshSession])
  );

  useEffect(() => {
    if (session.email) {
      isVerifiedAdmin(session.email).then(setIsAdmin);
      const namePart = session.email.split("@")[0] || "User";
      setEditUsername(username || namePart);
    } else {
      setIsAdmin(false);
    }
  }, [session.email]);

  async function finishLogin(nextEmail: string) {
    const role = session.intendedRole || "buyer";
    await session.markLoggedIn(nextEmail, role);
    const { ad: pending, productId: pendingProduct } = await session.consumePendingNavigation();

    if (role === "seller") {
      router.replace("/(tabs)/post-ad" as Href);
      return;
    }

    if (pendingProduct) {
      router.replace({
        pathname: "/product-insight",
        params: { id: pendingProduct },
      } as Href);
      return;
    }

    if (pending) {
      router.replace({
        pathname: "/container-details",
        params: { item: pending },
      } as Href);
      return;
    }

    router.replace("/dashboard-buyer" as Href);
  }

  async function submit() {
    const rawInput = loginInput.trim();
    const trimmedPassword = password.trim();

    if (!rawInput) {
      setNotice("Enter your username or email address.");
      return;
    }

    // Convert username to email if needed
    const resolvedEmail = rawInput.includes("@")
      ? rawInput.toLowerCase()
      : `${rawInput.toLowerCase().replace(/\s+/g, "")}@myvegmarket.com`;

    if (!trimmedPassword || (mode === "signup" && trimmedPassword.length < 6)) {
      setNotice(mode === "signup" ? "Password must be at least 6 characters." : "Enter your password.");
      return;
    }

    try {
      setBusy(true);
      setNotice(null);
      if (mode === "signup") {
        await signupExporter(resolvedEmail, trimmedPassword);
      } else {
        await loginExporter(resolvedEmail, trimmedPassword);
      }
      await finishLogin(resolvedEmail);
    } catch (err: any) {
      setNotice(err?.message || "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await clearExporterSession();
    await session.logout();
    setPassword("");
    setNotice("Logged out successfully.");
  }

  const intent = session.intendedRole;

  if (session.isLoggedIn) {
    const displayName = username || (session.email ? session.email.split("@")[0] : "Exporter");

    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* User Profile Banner with Edit Pencil */}
          <View style={styles.luxBanner}>
            <Pressable
              style={styles.pencilBtn}
              onPress={() => {
                setEditUsername(displayName);
                setEditAvatar(avatarUrl);
                setEditCompany(companyName);
                setEditLicense(licenseNumber);
                setShowEditModal(true);
              }}
              hitSlop={10}
            >
              <Ionicons name="pencil" size={16} color={BRAND.primary} />
            </Pressable>

            <View style={styles.avatarRing}>
              {avatarUrl ? (
                <View style={styles.avatarWrap}>
                  <Ionicons name="person" size={32} color={BRAND.primary} />
                </View>
              ) : (
                <Ionicons name="person" size={32} color={BRAND.primary} />
              )}
            </View>
            <Text style={styles.pageTitle}>{displayName}</Text>
            <Text style={styles.email}>{session.email}</Text>
            {companyName ? <Text style={styles.companySub}>{companyName}</Text> : null}

            <View style={styles.planChip}>
              <Ionicons name="ribbon-outline" size={14} color={BRAND.gold} />
              <Text style={styles.planChipText}>{planName}</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Your Dashboards</Text>
          <View style={styles.dashboardGrid}>
            <AnimatedPressable style={styles.dashCard} onPress={() => router.push("/dashboard-buyer" as Href)}>
              <View style={[styles.dashIcon, { backgroundColor: BRAND.primaryLight }]}>
                <Ionicons name="heart-outline" size={22} color={BRAND.primary} />
              </View>
              <View style={styles.dashCopy}>
                <Text style={styles.dashTitle}>My Dashboard</Text>
                <Text style={styles.dashSub}>Wishlist · Inquiries · Plan</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={BRAND.muted} />
            </AnimatedPressable>

            {session.role === "seller" ? (
              <AnimatedPressable style={styles.dashCard} onPress={() => router.push("/dashboard-seller" as Href)}>
                <View style={[styles.dashIcon, { backgroundColor: BRAND.accentSoft }]}>
                  <Ionicons name="storefront-outline" size={22} color={BRAND.accent} />
                </View>
                <View style={styles.dashCopy}>
                  <Text style={styles.dashTitle}>My Listings</Text>
                  <Text style={styles.dashSub}>Ads · Views · Relist</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={BRAND.muted} />
              </AnimatedPressable>
            ) : null}

            {isAdmin ? (
              <AnimatedPressable style={styles.dashCard} onPress={() => router.push("/dashboard-admin" as Href)}>
                <View style={[styles.dashIcon, { backgroundColor: "#FEF3C7" }]}>
                  <Ionicons name="shield-checkmark-outline" size={22} color={BRAND.gold} />
                </View>
                <View style={styles.dashCopy}>
                  <Text style={styles.dashTitle}>Admin Dashboard</Text>
                  <Text style={styles.dashSub}>Metrics · Calendar · FAQ</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={BRAND.muted} />
              </AnimatedPressable>
            ) : null}
          </View>

          <View style={styles.quickRow}>
            <AnimatedPressable style={styles.quickBtn} onPress={() => session.setWishlistOpen(true)}>
              <Ionicons name="heart" size={18} color={BRAND.primary} />
              <Text style={styles.quickText}>Wishlist ({session.wishlist.length})</Text>
            </AnimatedPressable>
            <AnimatedPressable style={styles.quickBtn} onPress={() => router.push("/inquiry-box" as Href)}>
              <Ionicons name="mail-outline" size={18} color={BRAND.primary} />
              <Text style={styles.quickText}>Inquiry Box</Text>
            </AnimatedPressable>
          </View>

          <AnimatedPressable style={styles.upgradeRow} onPress={() => router.push("/upgrade" as Href)}>
            <Ionicons name="diamond-outline" size={18} color={BRAND.gold} />
            <Text style={styles.upgradeRowText}>Upgrade Subscription</Text>
            <Ionicons name="chevron-forward" size={16} color={BRAND.muted} />
          </AnimatedPressable>

          <AnimatedPressable style={styles.logout} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </AnimatedPressable>

          <View style={styles.supportModule}>
            <View style={styles.supportHeader}>
              <Ionicons name="headset-outline" size={20} color={BRAND.primary} />
              <Text style={styles.supportTitle}>Support</Text>
            </View>
            <Text style={styles.supportSub}>We are here to help with shipments and pricing.</Text>
            <Pressable style={styles.supportRow} onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}>
              <Ionicons name="call-outline" size={18} color={BRAND.primary} />
              <Text style={styles.supportLink}>+91 {SUPPORT_PHONE}</Text>
            </Pressable>
            <Pressable style={styles.supportRow} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
              <Ionicons name="mail-outline" size={18} color={BRAND.primary} />
              <Text style={styles.supportLink}>{SUPPORT_EMAIL}</Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* Edit Profile Modal */}
        <Modal visible={showEditModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <Pressable onPress={() => setShowEditModal(false)} hitSlop={10}>
                  <Ionicons name="close" size={22} color={BRAND.text} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Media Picker Button */}
                <Text style={styles.label}>Profile Picture</Text>
                <View style={styles.pickerRow}>
                  <Pressable style={styles.mediaPickerBtn} onPress={pickProfileImage}>
                    <Ionicons name="camera-outline" size={20} color={BRAND.primary} />
                    <Text style={styles.mediaPickerText}>Select Photo from Media Library</Text>
                  </Pressable>
                </View>

                <Text style={styles.label}>Username</Text>
                <TextInput
                  value={editUsername}
                  onChangeText={(val) => {
                    setEditUsername(val);
                    setUsernameStatus(null);
                  }}
                  placeholder="Enter username"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                />
                {usernameStatus ? <Text style={styles.notice}>{usernameStatus}</Text> : null}

                {session.role === "seller" ? (
                  <>
                    <Text style={styles.label}>Company Name</Text>
                    <TextInput
                      value={editCompany}
                      onChangeText={setEditCompany}
                      placeholder="Your Business / Company"
                      placeholderTextColor="#9CA3AF"
                      style={styles.input}
                    />

                    <Text style={styles.label}>Trade License Number</Text>
                    <TextInput
                      value={editLicense}
                      onChangeText={setEditLicense}
                      placeholder="License / Registration No."
                      placeholderTextColor="#9CA3AF"
                      style={styles.input}
                    />
                  </>
                ) : null}

                {/* Password Change Toggle */}
                <Pressable
                  style={styles.passToggleRow}
                  onPress={() => setChangePasswordActive(!changePasswordActive)}
                >
                  <Ionicons
                    name={changePasswordActive ? "checkbox" : "square-outline"}
                    size={20}
                    color={BRAND.primary}
                  />
                  <Text style={styles.passToggleText}>Change Password</Text>
                </Pressable>

                {changePasswordActive ? (
                  <>
                    <Text style={styles.label}>New Login Password</Text>
                    <TextInput
                      value={editPassword}
                      onChangeText={setEditPassword}
                      secureTextEntry
                      placeholder="Minimum 6 characters"
                      placeholderTextColor="#9CA3AF"
                      style={styles.input}
                    />
                  </>
                ) : null}

                <AnimatedPressable style={styles.saveBtn} onPress={saveProfile} disabled={busy}>
                  {busy ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  )}
                </AnimatedPressable>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.pageTitle}>Welcome</Text>
          <Text style={styles.subtitle}>
            {intent === "seller"
              ? "Continue to post your shipment."
              : intent === "buyer"
                ? "Login to unlock shipment and price insights."
                : "Login to unlock wishlist, insights, and posting ads."}
          </Text>

          <View style={styles.card}>
            <View style={styles.modeRow}>
              <Pressable
                style={[styles.modeBtn, mode === "login" && styles.modeOn]}
                onPress={() => setMode("login")}
              >
                <Text style={[styles.modeText, mode === "login" && styles.modeTextOn]}>Login</Text>
              </Pressable>
              <Pressable
                style={[styles.modeBtn, mode === "signup" && styles.modeOn]}
                onPress={() => setMode("signup")}
              >
                <Text style={[styles.modeText, mode === "signup" && styles.modeTextOn]}>Signup</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Username or Email</Text>
            <TextInput
              value={loginInput}
              onChangeText={setLoginInput}
              autoCapitalize="none"
              placeholder="Username or name@company.com"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder={mode === "signup" ? "Minimum 6 characters" : "Enter password"}
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />

            {notice ? <Text style={styles.notice}>{notice}</Text> : null}

            <AnimatedPressable style={styles.primary} onPress={submit} disabled={busy}>
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryText}>{mode === "signup" ? "Create Account" : "Login"}</Text>
              )}
            </AnimatedPressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.pageBg },
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  luxBanner: {
    position: "relative",
    alignItems: "center",
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: "#E8F9EE",
  },
  pencilBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BRAND.border,
    shadowColor: BRAND.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarWrap: { width: "100%", height: "100%", borderRadius: 40, alignItems: "center", justifyContent: "center" },
  companySub: { marginTop: 2, fontSize: 12, fontWeight: "700", color: BRAND.primaryDark },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  modalTitle: { fontSize: 18, fontWeight: "900", color: BRAND.text },
  pickerRow: { marginVertical: 6 },
  mediaPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: BRAND.primaryLight,
    borderWidth: 1,
    borderColor: BRAND.primary,
  },
  mediaPickerText: { fontSize: 13, fontWeight: "800", color: BRAND.primaryDark },
  passToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    marginBottom: 6,
  },
  passToggleText: { fontSize: 14, fontWeight: "800", color: BRAND.text },
  saveBtn: {
    marginTop: 20,
    marginBottom: 16,
    height: 50,
    borderRadius: 999,
    backgroundColor: BRAND.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: BRAND.primary,
    marginBottom: 12,
    shadowColor: BRAND.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  pageTitle: { fontSize: 26, fontWeight: "900", color: BRAND.text },
  email: { marginTop: 4, fontWeight: "700", color: BRAND.muted },
  planChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    backgroundColor: "#FEF3C7",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  planChipText: { fontWeight: "800", color: BRAND.gold, fontSize: 12 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: BRAND.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  dashboardGrid: { gap: 10, marginBottom: 16 },
  dashCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: BRAND.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  dashIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dashCopy: { flex: 1 },
  dashTitle: { fontSize: 15, fontWeight: "800", color: BRAND.text },
  dashSub: { fontSize: 12, color: BRAND.muted, fontWeight: "600", marginTop: 2 },
  quickRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  quickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: BRAND.surface,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  quickText: { fontWeight: "800", color: BRAND.text, fontSize: 13 },
  upgradeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: BRAND.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  upgradeRowText: { flex: 1, fontWeight: "800", color: BRAND.text },
  subtitle: { fontSize: 14, lineHeight: 20, color: BRAND.muted, fontWeight: "600", marginBottom: 16 },
  card: {
    backgroundColor: BRAND.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 18,
  },
  modeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  modeBtn: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BRAND.border,
    alignItems: "center",
    justifyContent: "center",
  },
  modeOn: { backgroundColor: BRAND.primary, borderColor: BRAND.primary },
  modeText: { fontWeight: "800", color: BRAND.text },
  modeTextOn: { color: "#FFFFFF" },
  label: { marginTop: 10, marginBottom: 6, fontWeight: "800", color: BRAND.text },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRAND.border,
    paddingHorizontal: 14,
    fontWeight: "600",
    color: BRAND.text,
  },
  notice: { marginTop: 12, color: BRAND.danger, fontWeight: "700" },
  primary: {
    marginTop: 18,
    height: 52,
    borderRadius: 999,
    backgroundColor: BRAND.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#FFFFFF", fontWeight: "800" },
  logout: { alignItems: "center", paddingVertical: 14 },
  logoutText: { fontWeight: "800", color: BRAND.danger },
  supportModule: {
    marginTop: 8,
    backgroundColor: BRAND.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  supportHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  supportTitle: { fontSize: 16, fontWeight: "800", color: BRAND.text },
  supportSub: { marginTop: 4, color: BRAND.muted, fontWeight: "600", marginBottom: 12 },
  supportRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  supportLink: { color: BRAND.primary, fontWeight: "700" },
});
