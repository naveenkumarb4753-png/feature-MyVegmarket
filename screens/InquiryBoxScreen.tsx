import { BRAND } from "@/constants/colors";
import AnimatedPressable from "@/components/AnimatedPressable";
import EmptyState from "@/components/EmptyState";
import { readInquiries, writeInquiries, type Inquiry } from "@/lib/inquiries";
import { useAppSession } from "@/lib/appSession";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { safeBack } from "@/lib/nav";
import React, { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function InquiryBoxScreen() {
  const router = useRouter();
  const session = useAppSession();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [draft, setDraft] = useState("");
  const [productTitle, setProductTitle] = useState("General inquiry");

  const load = useCallback(async () => {
    if (!session.isLoggedIn) return;
    setInquiries(await readInquiries());
  }, [session.isLoggedIn]);

  useFocusEffect(
    useCallback(() => {
      if (!session.isLoggedIn) {
        router.replace("/(tabs)/account");
        return;
      }
      load();
    }, [session.isLoggedIn, load, router])
  );

  async function submitInquiry() {
    const msg = draft.trim();
    if (!msg) return;
    const item: Inquiry = {
      id: `inq-${Date.now()}`,
      productTitle,
      message: msg,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    const next = [item, ...inquiries];
    setInquiries(next);
    await writeInquiries(next);
    setDraft("");
    void import("@/lib/pushNotifications").then(({ notifyAdminInquiry }) => {
      void notifyAdminInquiry(session.email || "User", productTitle, msg);
    });
  }

  if (!session.isLoggedIn) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => safeBack(router, "/(tabs)")} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={BRAND.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Inquiry Box</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.composeCard}>
          <Text style={styles.composeTitle}>Send an inquiry</Text>
          <TextInput
            value={productTitle}
            onChangeText={setProductTitle}
            placeholder="Product / topic"
            placeholderTextColor={BRAND.muted}
            style={styles.input}
          />
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Your message to the team…"
            placeholderTextColor={BRAND.muted}
            style={[styles.input, styles.textArea]}
            multiline
          />
          <AnimatedPressable style={styles.sendBtn} onPress={submitInquiry}>
            <Ionicons name="send" size={16} color="#FFFFFF" />
            <Text style={styles.sendText}>Submit Inquiry</Text>
          </AnimatedPressable>
        </View>

        <Text style={styles.sectionTitle}>Your inquiries</Text>
        {inquiries.length === 0 ? (
          <EmptyState
            title="Your inbox is sprout-free"
            subtitle="Send an inquiry about shipments, pricing, or availability."
            icon="mail-open-outline"
          />
        ) : (
          inquiries.map((inq) => (
            <View key={inq.id} style={styles.inqCard}>
              <View style={styles.inqHead}>
                <Text style={styles.inqProduct}>{inq.productTitle}</Text>
                <View
                  style={[
                    styles.statusPill,
                    inq.status === "approved" && styles.statusApproved,
                    inq.status === "rejected" && styles.statusRejected,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {inq.status === "pending" ? "Pending" : inq.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.inqMsg}>{inq.message}</Text>
              <Text style={styles.inqDate}>
                {new Date(inq.createdAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.pageBg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: BRAND.text },
  content: { padding: 16, paddingBottom: 32 },
  composeCard: {
    backgroundColor: BRAND.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
    marginBottom: 20,
  },
  composeTitle: { fontSize: 16, fontWeight: "800", color: BRAND.text, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontWeight: "600",
    color: BRAND.text,
    marginBottom: 10,
  },
  textArea: { minHeight: 90, textAlignVertical: "top" },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: BRAND.primary,
    borderRadius: 999,
    paddingVertical: 14,
    marginTop: 4,
  },
  sendText: { color: "#FFFFFF", fontWeight: "800" },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: BRAND.text, marginBottom: 12 },
  inqCard: {
    backgroundColor: BRAND.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  inqHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  inqProduct: { fontSize: 15, fontWeight: "800", color: BRAND.text, flex: 1 },
  statusPill: {
    backgroundColor: BRAND.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusApproved: { backgroundColor: BRAND.primaryLight },
  statusRejected: { backgroundColor: "#FEE2E2" },
  statusText: { fontSize: 11, fontWeight: "800", color: BRAND.accent, textTransform: "capitalize" },
  inqMsg: { marginTop: 8, color: BRAND.muted, lineHeight: 20, fontWeight: "600" },
  inqDate: { marginTop: 8, fontSize: 12, color: "#94A3B8", fontWeight: "600" },
});
