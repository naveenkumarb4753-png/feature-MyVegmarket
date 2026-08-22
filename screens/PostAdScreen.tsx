import AnimatedPressable from "@/components/AnimatedPressable";
import VegLoader from "@/components/VegLoader";
import { BRAND } from "@/constants/colors";
import { useAppSession } from "@/lib/appSession";
import { getExporterSession } from "@/lib/exporterAuth";
import { supabase } from "@/lib/supabase";
import { Picker } from "@react-native-picker/picker";
import { File as ExpoFile } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const EXPORTERS_TABLE = "exporters";
const LISTINGS_TABLE = "container_listings";
const BUCKET = "container_images";

const CONTAINER_TYPES = ["20ft", "40ft", "20ft Reefer", "40ft Reefer"];
const CATEGORIES = ["vegetables", "fruits", "spices", "nuts", "eggs", "oils"];
const PACKAGING_TYPES = ["Bag", "Carton Box"] as const;
const RATE_TYPES = ["Per Kg", "Per Piece"] as const;
const CURRENCIES = ["AED", "USD", "INR", "EUR"];

type ExporterRow = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  trade_license_no: string | null;
  approved: boolean | null;
  status: string | null;
  created_at?: string | null;
};

type ProductLine = {
  commodity: string;
  packagingType: "Bag" | "Carton Box";
  packageCount: string;
  weightPerPackageKg: string;
  rateType: "Per Kg" | "Per Piece";
  rate: string;
};

type NoticeState = {
  type: "success" | "error" | "info";
  text: string;
} | null;

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function makeBatchId() {
  const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return template.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function packageLabel(packagingType: ProductLine["packagingType"]) {
  return packagingType === "Carton Box" ? "Boxes" : "Bags";
}

function totalWeightKg(line: ProductLine) {
  const count = Number(line.packageCount);
  const weight = Number(line.weightPerPackageKg);

  if (!Number.isFinite(count) || !Number.isFinite(weight) || count <= 0 || weight <= 0) {
    return null;
  }

  return count * weight;
}

function formatTotalWeight(line: ProductLine) {
  const total = totalWeightKg(line);
  if (total === null) return "Enter package count and weight to calculate";

  const kg = total.toLocaleString("en-US", { maximumFractionDigits: 2 });
  const mt = total / 1000;
  const mtText = mt.toLocaleString("en-US", { maximumFractionDigits: 3 });

  return `${kg} kg (${mtText} MT)`;
}

export default function PostAdScreen() {
  const router = useRouter();
  const { setIntendedRole, logout, ready, isLoggedIn } = useAppSession();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ExporterRow | null>(null);

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [tradeLicenseNo, setTradeLicenseNo] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [submittingVerification, setSubmittingVerification] = useState(false);

  const [category, setCategory] = useState(CATEGORIES[0]);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("Dubai");
  const [marketLocation, setMarketLocation] = useState("");
  const [containerType, setContainerType] = useState(CONTAINER_TYPES[0]);
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [readyDate, setReadyDate] = useState(new Date().toISOString().slice(0, 10));

  const [lines, setLines] = useState<ProductLine[]>([
    {
      commodity: "",
      packagingType: "Bag",
      packageCount: "",
      weightPerPackageKg: "",
      rateType: "Per Kg",
      rate: "",
    },
  ]);

  const [imageAsset, setImageAsset] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [submittingListing, setSubmittingListing] = useState(false);

  const [notice, setNotice] = useState<NoticeState>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayStatus = useMemo(() => {
    const st = (profile?.status ?? "").toLowerCase();
    if (st) return st;
    if (profile?.approved) return "approved";
    return profile ? "pending" : "";
  }, [profile]);

  const isVerified = useMemo(() => {
    const st = (profile?.status ?? "").toLowerCase();
    return profile?.approved === true || st === "approved";
  }, [profile]);

  function showNotice(type: "success" | "error" | "info", text: string) {
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
    }
    setNotice({ type, text });
    noticeTimerRef.current = setTimeout(() => {
      setNotice(null);
      noticeTimerRef.current = null;
    }, 3000);
  }

  function clearNotice() {
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
    setNotice(null);
  }

  const loadState = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const session = await getExporterSession();
      const email = session?.email ?? null;

      setSessionEmail(email);

      if (!email) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from(EXPORTERS_TABLE)
        .select(
          "id,full_name,company_name,email,phone,country,city,trade_license_no,approved,status,created_at"
        )
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        showNotice("error", `Failed to load exporter profile: ${error.message}`);
        setProfile(null);
        return;
      }

      const row = (data as ExporterRow | null) ?? null;
      setProfile(row);

      if (row) {
        setFullName(row.full_name ?? "");
        setCompanyName(row.company_name ?? "");
        setPhone(row.phone ?? "");
        setTradeLicenseNo(row.trade_license_no ?? "");
        setCountry(row.country ?? "");
        setCity(row.city ?? "");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIntendedRole("seller");
      if (ready && !isLoggedIn) {
        router.replace("/(tabs)/account" as Href);
        return;
      }
      loadState();
      return () => {
        if (noticeTimerRef.current) {
          clearTimeout(noticeTimerRef.current);
          noticeTimerRef.current = null;
        }
      };
    }, [loadState, setIntendedRole, ready, isLoggedIn, router])
  );

  async function handleLogout() {
    await logout();
    setSessionEmail(null);
    setProfile(null);
    setImageAsset(null);
    setUploadedPath(null);
    clearNotice();
    router.replace("/(tabs)/account" as Href);
  }

  async function submitVerification() {
    if (!sessionEmail) {
      showNotice("error", "Please login first.");
      return;
    }

    if (profile?.email) {
      showNotice("info", "Your exporter verification is already submitted.");
      return;
    }

    if (!fullName.trim()) {
      showNotice("error", "Enter full name.");
      return;
    }
    if (!companyName.trim()) {
      showNotice("error", "Enter company name.");
      return;
    }
    if (!phone.trim()) {
      showNotice("error", "Enter phone number.");
      return;
    }
    if (!tradeLicenseNo.trim()) {
      showNotice("error", "Enter trade license number.");
      return;
    }

    try {
      setSubmittingVerification(true);

      const payload = {
        email: sessionEmail.trim().toLowerCase(),
        full_name: fullName.trim(),
        company_name: companyName.trim(),
        phone: phone.trim(),
        trade_license_no: tradeLicenseNo.trim(),
        country: country.trim() || null,
        city: city.trim() || null,
        approved: false,
        status: "pending",
      };

      const { data, error } = await supabase
        .from(EXPORTERS_TABLE)
        .insert([payload])
        .select(
          "id,full_name,company_name,email,phone,country,city,trade_license_no,approved,status,created_at"
        )
        .single();

      if (error) {
        showNotice("error", error.message);
        return;
      }

      setProfile(data as ExporterRow);
      showNotice(
        "success",
        "Verification submitted successfully. Waiting for admin approval."
      );
    } finally {
      setSubmittingVerification(false);
    }
  }

  function updateLine(index: number, patch: Partial<ProductLine>) {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...patch } : line))
    );
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        commodity: "",
        packagingType: "Bag",
        packageCount: "",
        weightPerPackageKg: "",
        rateType: "Per Kg",
        rate: "",
      },
    ]);
  }

  function removeLine(index: number) {
    setLines((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)
    );
  }

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showNotice("error", "Please allow photo access to upload image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets?.length) {
      setImageAsset(result.assets[0]);
      setUploadedPath(null);
    }
  }

 async function uploadContainerImage(batchId: string) {
  if (!imageAsset?.uri) return null;

  try {
    const originTag = slugify(origin || "unknown-origin");
    const firstProduct = slugify(
      lines[0]?.commodity || "container"
    );

    const mimeType =
      imageAsset.mimeType || "image/jpeg";

    let ext =
      imageAsset.fileName
        ?.split(".")
        .pop()
        ?.toLowerCase() ||
      mimeType.split("/")[1] ||
      "jpg";

    if (ext === "jpeg") {
      ext = "jpg";
    }

    const path =
      `${originTag}/${firstProduct}-${batchId}.${ext}`;

    // IMPORTANT: Expo File, not browser File
    const file = new ExpoFile(imageAsset.uri);

    if (!file.exists) {
      showNotice(
        "error",
        "Selected image file could not be found."
      );
      return null;
    }

    const arrayBuffer = await file.arrayBuffer();

    console.log("IMAGE URI:", imageAsset.uri);
    console.log("IMAGE SIZE:", file.size);
    console.log("IMAGE TYPE:", mimeType);
    console.log("UPLOAD PATH:", path);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, arrayBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      console.log("IMAGE UPLOAD ERROR:", error);

      showNotice(
        "error",
        `Image upload failed: ${error.message}`
      );

      return null;
    }

    console.log("IMAGE UPLOADED SUCCESSFULLY:", path);

    return path;
  } catch (error: any) {
    console.log("IMAGE UPLOAD EXCEPTION:", error);

    showNotice(
      "error",
      `Image upload failed: ${
        error?.message ?? "Unknown error"
      }`
    );

    return null;
  }
}

  async function submitListing() {
    if (!sessionEmail) {
      showNotice("error", "Please login first.");
      return;
    }

    if (!profile) {
      showNotice("error", "Please complete exporter verification first.");
      return;
    }

    if (!isVerified) {
      showNotice("info", "Your exporter account is still pending admin approval.");
      return;
    }

    if (!category.trim()) {
      showNotice("error", "Choose category.");
      return;
    }
    if (!origin.trim()) {
      showNotice("error", "Enter origin country.");
      return;
    }
    if (!destination.trim()) {
      showNotice("error", "Enter destination.");
      return;
    }
    if (!marketLocation.trim()) {
      showNotice("error", "Enter container market location.");
      return;
    }
    if (!readyDate.trim()) {
      showNotice("error", "Enter ready date.");
      return;
    }
    if (!(profile.phone ?? "").trim()) {
      showNotice("error", "Phone is missing in exporter profile.");
      return;
    }

    const cleanLines = lines
      .map((line) => ({
        ...line,
        commodity: line.commodity.trim(),
        packageCount: line.packageCount.trim(),
        weightPerPackageKg: line.weightPerPackageKg.trim(),
        rate: line.rate.trim(),
      }))
      .filter((line) => line.commodity.length > 0);

    if (cleanLines.length === 0) {
      showNotice("error", "Add at least one product.");
      return;
    }

    for (const line of cleanLines) {
      const packageCount = Number(line.packageCount);
      if (
        !line.packageCount ||
        !Number.isFinite(packageCount) ||
        packageCount <= 0 ||
        !Number.isInteger(packageCount)
      ) {
        showNotice(
          "error",
          `Enter a valid number of ${packageLabel(line.packagingType).toLowerCase()} for all products.`
        );
        return;
      }

      const weightPerPackageKg = Number(line.weightPerPackageKg);
      if (
        !line.weightPerPackageKg ||
        !Number.isFinite(weightPerPackageKg) ||
        weightPerPackageKg <= 0
      ) {
        showNotice(
          "error",
          `Enter a valid weight per ${line.packagingType === "Carton Box" ? "box" : "bag"} for all products.`
        );
        return;
      }

      const rate = Number(line.rate);
      if (!line.rate || !Number.isFinite(rate) || rate <= 0) {
        showNotice(
          "error",
          `Enter a valid ${line.rateType === "Per Kg" ? "rate per kg" : "rate per piece"} for all products.`
        );
        return;
      }
    }

    try {
      setSubmittingListing(true);

      const batchId = makeBatchId();
      const imgPath = uploadedPath ?? (await uploadContainerImage(batchId));
      if (imageAsset && !imgPath) return;
      if (imgPath) setUploadedPath(imgPath);

      const rows = cleanLines.map((line) => {
        const packageCount = Number(line.packageCount);
        const weightPerPackageKg = Number(line.weightPerPackageKg);
        const rate = Number(line.rate);
        const normalizedRateType = line.rateType === "Per Kg" ? "per_kg" : "per_piece";

        return {
          exporter_uuid: profile.id,
          email: sessionEmail,
          category,
          origin: origin.trim(),
          destination: destination.trim(),
          ready_date: readyDate,
          container_type: containerType,
          currency,
          whatsapp: (profile.phone ?? "").trim(),
          market_location: marketLocation.trim(),
          image_path: imgPath,
          batch_id: batchId,
          commodity: line.commodity,

          // New packing / rate structure
          packaging_type: line.packagingType,
          package_count: packageCount,
          weight_per_package_kg: weightPerPackageKg,
          rate_type: normalizedRateType,
          rate,

          status: "pending",
          company_name: profile.company_name ?? null,
          contact_person: profile.full_name ?? null,
        };
      });

      const { error } = await supabase.from(LISTINGS_TABLE).insert(rows);

      console.log("LISTING INSERT ERROR:", error);
      console.log("LISTING ROWS:", rows);

      if (error) {
        showNotice("error", error.message);
        return;
      }

      showNotice("success", "Ad submitted successfully. Waiting for admin approval.");

      setCategory(CATEGORIES[0]);
      setOrigin("");
      setDestination("Dubai");
      setMarketLocation("");
      setContainerType(CONTAINER_TYPES[0]);
      setCurrency(CURRENCIES[0]);
      setReadyDate(new Date().toISOString().slice(0, 10));
      setLines([
        {
          commodity: "",
          packagingType: "Bag",
          packageCount: "",
          weightPerPackageKg: "",
          rateType: "Per Kg",
          rate: "",
        },
      ]);
      setImageAsset(null);
      setUploadedPath(null);
    } finally {
      setSubmittingListing(false);
    }
  }

  function renderTextField(
    label: string,
    value: string,
    setValue: (v: string) => void,
    placeholder?: string,
    keyboardType: "default" | "numeric" | "email-address" = "default",
    secureTextEntry = false
  ) {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor="#9BB1A6"
          style={styles.input}
          keyboardType={keyboardType}
          autoCapitalize="none"
          secureTextEntry={secureTextEntry}
        />
      </View>
    );
  }

  function renderChoiceRow(
    label: string,
    value: string,
    options: string[],
    onSelect: (v: string) => void
  ) {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>

        <View style={styles.dropdownBox}>
          <Picker
            selectedValue={value}
            onValueChange={(itemValue) => onSelect(String(itemValue))}
            style={styles.dropdownPicker}
            dropdownIconColor="#648770"
            mode="dropdown"
          >
            {options.map((option) => (
              <Picker.Item
                key={option}
                label={option}
                value={option}
                color="#111713"
              />
            ))}
          </Picker>
        </View>
      </View>
    );
  }

  function renderNotice() {
    if (!notice) return null;

    return (
      <View
        style={[
          styles.noticeBox,
          notice.type === "success"
            ? styles.noticeSuccess
            : notice.type === "error"
            ? styles.noticeError
            : styles.noticeInfo,
        ]}
      >
        <Text style={styles.noticeText}>{notice.text}</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <VegLoader context="ads" label="Loading exporter status…" />
      </SafeAreaView>
    );
  }

  if (!sessionEmail) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <VegLoader context="auth" label="Redirecting to login…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadState(true)}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {renderNotice()}

          <View style={styles.topBar}>
            <View style={styles.topBarTextWrap}>
              <Text style={styles.pageTitle}>Post Your Ad</Text>
              <Text style={styles.pageSubtitle}>{sessionEmail}</Text>
            </View>

            <Pressable style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </View>

          {!profile ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Exporter Verification</Text>
              <Text style={styles.sectionSubtitle}>
                Submit your business details once. Admin approves you before you can post listings.
              </Text>

              {renderTextField("Full Name", fullName, setFullName, "Enter your full name")}
              {renderTextField(
                "Company Name",
                companyName,
                setCompanyName,
                "Enter company name"
              )}
              {renderTextField("Phone", phone, setPhone, "Enter phone number")}
              {renderTextField(
                "Trade License No",
                tradeLicenseNo,
                setTradeLicenseNo,
                "Enter trade license number"
              )}
              {renderTextField("Country", country, setCountry, "Enter country")}
              {renderTextField("City", city, setCity, "Enter city")}

              <AnimatedPressable
                style={[
                  styles.primaryBtn,
                  submittingVerification && styles.disabledBtn,
                ]}
                onPress={submitVerification}
                disabled={submittingVerification}
              >
                {submittingVerification ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Submit Verification</Text>
                )}
              </AnimatedPressable>
            </View>
          ) : !isVerified ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Approval Status</Text>
              <Text style={styles.statusBadge}>
                Status: {displayStatus || "pending"}
              </Text>
              <Text style={styles.sectionSubtitle}>
                Your exporter verification has been submitted. Please wait for admin approval before creating listings.
              </Text>

              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Company</Text>
                <Text style={styles.infoValue}>{profile.company_name || "—"}</Text>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{profile.phone || "—"}</Text>
              </View>

              <Pressable
                style={styles.secondaryBtn}
                onPress={() => loadState(true)}
              >
                <Text style={styles.secondaryBtnText}>Refresh Status</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Container Details</Text>
                <Text style={styles.sectionSubtitle}>
                  Fill container details once, then add the products inside this container.
                </Text>

                {renderChoiceRow("Category", category, CATEGORIES, setCategory)}
                {renderTextField(
                  "Container Market Location",
                  marketLocation,
                  setMarketLocation,
                  "Ex: Al Aweer Market - Yard 12"
                )}
                {renderTextField("Origin Country", origin, setOrigin, "Ex: India")}
                {renderTextField("Destination", destination, setDestination, "Ex: Dubai")}
                {renderChoiceRow(
                  "Container Type",
                  containerType,
                  CONTAINER_TYPES,
                  setContainerType
                )}
                {renderChoiceRow("Currency", currency, CURRENCIES, setCurrency)}
                {renderTextField("Ready Date", readyDate, setReadyDate, "YYYY-MM-DD")}

                <View style={styles.field}>
                  <Text style={styles.label}>Container Photo</Text>
                  <Pressable style={styles.secondaryBtn} onPress={pickImage}>
                    <Text style={styles.secondaryBtnText}>
                      {imageAsset ? "Change Image" : "Pick Image"}
                    </Text>
                  </Pressable>

                  {imageAsset?.uri ? (
                    <Image source={{ uri: imageAsset.uri }} style={styles.previewImage} />
                  ) : null}
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.productsHeader}>
                  <Text style={styles.sectionTitle}>Products in this Container</Text>
                  <Pressable style={styles.smallBtn} onPress={addLine}>
                    <Text style={styles.smallBtnText}>+ Add Product</Text>
                  </Pressable>
                </View>

                {lines.map((line, index) => (
                  <View key={index} style={styles.lineCard}>
                    <View style={styles.lineTop}>
                      <Text style={styles.lineTitle}>Product #{index + 1}</Text>
                      <Pressable
                        onPress={() => removeLine(index)}
                        disabled={lines.length === 1}
                      >
                        <Text
                          style={[
                            styles.removeText,
                            lines.length === 1 && styles.removeTextDisabled,
                          ]}
                        >
                          Remove
                        </Text>
                      </Pressable>
                    </View>

                    {renderTextField(
                      "Product Name",
                      line.commodity,
                      (v) => updateLine(index, { commodity: v }),
                      "Ex: Onion"
                    )}

                    {renderChoiceRow(
                      "Packaging Type",
                      line.packagingType,
                      [...PACKAGING_TYPES],
                      (v) =>
                        updateLine(index, {
                          packagingType: v as ProductLine["packagingType"],
                        })
                    )}

                    {renderTextField(
                      line.packagingType === "Carton Box"
                        ? "Number of Boxes"
                        : "Number of Bags",
                      line.packageCount,
                      (v) => updateLine(index, { packageCount: v }),
                      line.packagingType === "Carton Box" ? "Ex: 1200" : "Ex: 520",
                      "numeric"
                    )}

                    {renderTextField(
                      line.packagingType === "Carton Box"
                        ? "Weight per Box (kg)"
                        : "Weight per Bag (kg)",
                      line.weightPerPackageKg,
                      (v) => updateLine(index, { weightPerPackageKg: v }),
                      line.packagingType === "Carton Box" ? "Ex: 4" : "Ex: 25",
                      "numeric"
                    )}

                    <View style={styles.totalWeightBox}>
                      <Text style={styles.totalWeightLabel}>Total Packed Weight</Text>
                      <Text style={styles.totalWeightValue}>
                        {formatTotalWeight(line)}
                      </Text>
                    </View>

                    {renderChoiceRow(
                      "Rate Type",
                      line.rateType,
                      [...RATE_TYPES],
                      (v) =>
                        updateLine(index, {
                          rateType: v as ProductLine["rateType"],
                        })
                    )}

                    {renderTextField(
                      line.rateType === "Per Kg" ? "Rate per Kg" : "Rate per Piece",
                      line.rate,
                      (v) => updateLine(index, { rate: v }),
                      line.rateType === "Per Kg" ? "Ex: 2.40" : "Ex: 18",
                      "numeric"
                    )}
                  </View>
                ))}

                <AnimatedPressable
                  style={[styles.primaryBtn, submittingListing && styles.disabledBtn]}
                  onPress={submitListing}
                  disabled={submittingListing}
                >
                  {submittingListing ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Submit to Admin</Text>
                  )}
                </AnimatedPressable>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F6F8F7",
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#648770",
    fontWeight: "600",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E8E3",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  topSpace: {
    marginTop: 14,
  },
  centerText: {
    textAlign: "center",
  },
  noticeBox: {
    marginBottom: 14,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  noticeSuccess: {
    backgroundColor: "#EAF8EF",
    borderColor: "#BFE8CD",
  },
  noticeError: {
    backgroundColor: "#FDEEEE",
    borderColor: "#F5B5B5",
  },
  noticeInfo: {
    backgroundColor: "#EEF4FF",
    borderColor: "#C9D9FF",
  },
  noticeText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111713",
    lineHeight: 20,
  },
  primaryBtn: {
    marginTop: 20,
    minHeight: 54,
    borderRadius: 999,
    paddingHorizontal: 22,
    backgroundColor: BRAND.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryBtn: {
    marginTop: 18,
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 18,
    backgroundColor: "#EEF2F0",
    borderWidth: 1,
    borderColor: "#E0E8E3",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    color: "#111713",
    fontSize: 14,
    fontWeight: "800",
  },
  disabledBtn: {
    opacity: 0.7,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
    gap: 12,
  },
  topBarTextWrap: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#111713",
  },
  pageSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#648770",
    fontWeight: "600",
  },
  logoutBtn: {
    minHeight: 40,
    borderRadius: 999,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E8E3",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    color: "#111713",
    fontSize: 13,
    fontWeight: "800",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E0E8E3",
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111713",
    flexShrink: 1,
  },
  sectionSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#648770",
    fontWeight: "500",
  },
  modeRow: {
    marginTop: 22,
    flexDirection: "row",
    gap: 10,
  },
  modeBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E0E8E3",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  modeBtnActiveGreen: {
    backgroundColor: BRAND.primary,
    borderColor: BRAND.primary,
  },
  modeBtnActiveDark: {
    backgroundColor: "#111713",
    borderColor: "#111713",
  },
  modeText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111713",
  },
  modeTextActiveWhite: {
    color: "#FFFFFF",
  },
  statusBadge: {
    marginTop: 14,
    alignSelf: "flex-start",
    backgroundColor: "#EEF2F0",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: "800",
    color: "#111713",
  },
  field: {
    marginTop: 14,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "800",
    color: "#111713",
  },
  input: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E0E8E3",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#111713",
    fontWeight: "600",
  },
  dropdownBox: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E0E8E3",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    overflow: "hidden",
  },
  dropdownPicker: {
    height: 54,
    width: "100%",
    color: "#111713",
    fontSize: 15,
  },
  infoBox: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E0E8E3",
    backgroundColor: "#F8FAF9",
    padding: 14,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#648770",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111713",
  },
  previewImage: {
    marginTop: 12,
    width: "100%",
    height: 180,
    borderRadius: 18,
    resizeMode: "cover",
  },
  productsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 4,
  },
  smallBtn: {
    minHeight: 38,
    borderRadius: 999,
    paddingHorizontal: 14,
    backgroundColor: "#EEF2F0",
    borderWidth: 1,
    borderColor: "#E0E8E3",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  smallBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111713",
  },
  totalWeightBox: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DCE9E1",
    backgroundColor: "#F1F8F4",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  totalWeightLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#648770",
    marginBottom: 4,
  },
  totalWeightValue: {
    fontSize: 16,
    fontWeight: "900",
    color: BRAND.primary,
  },
  lineCard: {
    marginTop: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E8E3",
    backgroundColor: "#FBFCFB",
    padding: 14,
  },
  lineTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  lineTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111713",
  },
  removeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#C62828",
  },
  removeTextDisabled: {
    color: "#B9C8BF",
  },
}); 