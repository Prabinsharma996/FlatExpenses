import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";

type Props = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
  tint?: "neutral" | "accent";
};

// Shared "nothing here yet" card: icon badge + title + subtitle + optional CTA.
// Used by Home (no book), Expenses, Balances (all settled) and Voting empty states.
export default function EmptyState({ icon, title, subtitle, actionLabel, onAction, tint = "neutral" }: Props) {
  const { colors } = useTheme();
  return (
    <GlassCard style={styles.card}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: tint === "accent" ? colors.accentSoft : colors.input },
        ]}
      >
        <Feather name={icon} size={26} color={tint === "accent" ? colors.accent : colors.textTertiary} />
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      {!!actionLabel && !!onAction && (
        <GlassButton label={actionLabel} onPress={onAction} style={styles.action} />
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", paddingVertical: 32 },
  iconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  title: { fontSize: 17, fontWeight: "800", marginBottom: 6 },
  subtitle: { fontSize: 13, textAlign: "center", lineHeight: 18, maxWidth: 260 },
  action: { marginTop: 20, alignSelf: "stretch" },
});
