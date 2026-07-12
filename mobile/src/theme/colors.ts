// Flat, card-based light/dark theme. Screens pull the active palette from
// useTheme() rather than importing static colors, so switching modes re-themes
// every screen, not just the shared components.

export type Palette = {
  mode: "light" | "dark";
  background: string;
  card: string;
  cardBorder: string;
  input: string;
  inputBorder: string;
  divider: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentSoft: string;
  accentBorder: string;
  onAccent: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  tabBar: string;
  tabBarBorder: string;
  tabInactive: string;
  overlay: string;
};

export const lightPalette: Palette = {
  mode: "light",
  background: "#F1F5F3",
  card: "#FFFFFF",
  cardBorder: "rgba(15,23,42,0.07)",
  input: "#F3F4F6",
  inputBorder: "rgba(15,23,42,0.09)",
  divider: "rgba(15,23,42,0.08)",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  textTertiary: "#9CA3AF",
  accent: "#10B981",
  accentSoft: "rgba(16,185,129,0.12)",
  accentBorder: "rgba(16,185,129,0.5)",
  onAccent: "#FFFFFF",
  danger: "#EF4444",
  dangerSoft: "rgba(239,68,68,0.12)",
  warning: "#F59E0B",
  tabBar: "#FFFFFF",
  tabBarBorder: "#E5E7EB",
  tabInactive: "#9CA3AF",
  overlay: "rgba(15,23,42,0.4)",
};

export const darkPalette: Palette = {
  mode: "dark",
  background: "#0B1220",
  card: "#161F30",
  cardBorder: "rgba(255,255,255,0.08)",
  input: "#1F2937",
  inputBorder: "rgba(255,255,255,0.1)",
  divider: "rgba(255,255,255,0.08)",
  textPrimary: "#F3F4F6",
  textSecondary: "#9CA3AF",
  textTertiary: "#6B7280",
  accent: "#34D399",
  accentSoft: "rgba(52,211,153,0.16)",
  accentBorder: "rgba(52,211,153,0.55)",
  onAccent: "#0B1220",
  danger: "#F87171",
  dangerSoft: "rgba(248,113,113,0.16)",
  warning: "#FBBF24",
  tabBar: "#111827",
  tabBarBorder: "rgba(255,255,255,0.08)",
  tabInactive: "#6B7280",
  overlay: "rgba(0,0,0,0.6)",
};

// Fixed categorical order — colors are assigned by category identity (alphabetical),
// never by amount rank, so a category keeps its color across refreshes.
export const CATEGORY_PALETTE = [
  "#10B981", // emerald
  "#6366F1", // indigo
  "#F59E0B", // amber
  "#22D3EE", // cyan
  "#EC4899", // pink
  "#F43F5E", // rose
  "#8B5CF6", // violet
  "#FB923C", // orange
];

export function colorForCategories(categories: string[]): Map<string, string> {
  const sorted = [...categories].sort((a, b) => a.localeCompare(b));
  const map = new Map<string, string>();
  sorted.forEach((c, i) => map.set(c, CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]));
  return map;
}
