/** Vibrant Zepto/Blinkit/BigBasket-inspired premium palette */
export const BRAND = {
  primary: "#0A8A3A",       // Deep saturated green (BigBasket-style)
  primaryDark: "#065F24",   // Even deeper for pressed states
  primaryLight: "#D1FAE5",  // Soft mint background tint
  primaryGlow: "#6EE7A0",   // Glow ring for hero elements

  accent: "#FF5A1F",        // Zepto orange — warm CTA energy
  accentSoft: "#FFF3EE",    // Soft peach background tint
  accentGold: "#F59E0B",    // Gold / premium badge

  surface: "#FFFFFF",
  surfaceElevated: "#FAFFFE", // Slightly tinted elevated cards
  pageBg: "#F4FAF6",         // Soft green-tinted page

  text: "#0D1B12",           // Near-black with green hue
  textSecondary: "#374151",
  muted: "#6B7280",
  mutedLight: "#9CA3AF",

  border: "#D1E8D9",         // Greenish border
  borderLight: "#E8F5EC",

  danger: "#DC2626",
  success: "#059669",
  warning: "#D97706",
  gold: "#F59E0B",

  shadow: "#0D1B12",         // Deep shadow tint
  shadowMd: "#0A8A3A22",     // Colored shadow for green elements
};

export const GRADIENT = {
  hero: ["#E8FFF0", "#FFFFFF"],
  heroGreen: ["#0A8A3A", "#065F24"],
  card: ["#FFFFFF", "#F4FAF6"],
  accent: ["#FF5A1F", "#E0440C"],
};

/** Semantic color tokens for product categories */
export const CATEGORY_COLORS = {
  fruits:     { bg: "#FFF7ED", accent: "#EA580C", pill: "#FED7AA", label: "Fruits" },
  vegetables: { bg: "#ECFDF5", accent: "#059669", pill: "#A7F3D0", label: "Vegetables" },
  spices:     { bg: "#FEF2F2", accent: "#DC2626", pill: "#FECACA", label: "Spices" },
  nuts:       { bg: "#FFFBEB", accent: "#D97706", pill: "#FDE68A", label: "Nuts" },
  eggs:       { bg: "#FEFCE8", accent: "#CA8A04", pill: "#FEF08A", label: "Eggs" },
  oils:       { bg: "#EEF2FF", accent: "#4F46E5", pill: "#C7D2FE", label: "Oils" },
  herbs:      { bg: "#F0FDF4", accent: "#16A34A", pill: "#BBF7D0", label: "Herbs" },
  default:    { bg: "#ECFDF5", accent: "#0A8A3A", pill: "#A7F3D0", label: "Produce" },
};
