import React from "react";
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from "react-native";
import { useTheme } from "../theme/ThemeContext";

type Props = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  style?: ViewStyle;
};

// Outlined pill; selected = accent border + soft accent tint + accent text
// (matches the Group Type / filter chip look, not a filled/inverted chip).
export default function Chip({ label, selected, onPress, style }: Props) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.accentSoft : colors.card,
          borderColor: selected ? colors.accentBorder : colors.cardBorder,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color: selected ? colors.accent : colors.textPrimary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  text: { fontWeight: "600", fontSize: 13 },
});
