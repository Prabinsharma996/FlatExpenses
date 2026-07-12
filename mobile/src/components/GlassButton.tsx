import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from "react-native";
import { useTheme } from "../theme/ThemeContext";

type Variant = "primary" | "glass" | "danger" | "ghost";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  icon?: string;
};

// "glass" is kept as a variant name for call-site compatibility but now renders
// as a neutral bordered secondary button rather than a blurred glass panel.
export default function GlassButton({ label, onPress, variant = "primary", disabled, loading, style, icon }: Props) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const bg = variant === "primary" ? colors.accent : variant === "danger" ? colors.danger : variant === "glass" ? colors.card : "transparent";
  const border = variant === "glass" ? colors.cardBorder : "transparent";
  const labelColor =
    variant === "primary" || variant === "danger" ? colors.onAccent : variant === "glass" ? colors.textPrimary : colors.accent;

  const content = loading ? (
    <ActivityIndicator color={labelColor} />
  ) : (
    <Text style={[styles.label, { color: labelColor }]}>
      {icon ? `${icon}  ` : ""}
      {label}
    </Text>
  );

  if (variant === "ghost") {
    return (
      <TouchableOpacity onPress={onPress} disabled={isDisabled} style={[styles.ghostBtn, style]} activeOpacity={0.6}>
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[
        styles.btnShape,
        { backgroundColor: bg, borderColor: border, borderWidth: variant === "glass" ? 1 : 0 },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btnShape: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 15, fontWeight: "700" },
  ghostBtn: { paddingVertical: 10, paddingHorizontal: 12 },
  disabled: { opacity: 0.5 },
});
