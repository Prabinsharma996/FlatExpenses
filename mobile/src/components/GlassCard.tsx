import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "../theme/ThemeContext";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  strong?: boolean;
  padded?: boolean;
};

// Solid white/dark card with a hairline border — the core surface of the flat design.
// `strong` gives it a soft accent tint instead of the plain card color (used for
// hero/callout cards like the invite-code box).
export default function GlassCard({ children, style, strong = false, padded = true }: Props) {
  const { colors, mode } = useTheme();
  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: strong ? colors.accentSoft : colors.card,
          borderColor: strong ? colors.accentBorder : colors.cardBorder,
          // `strong` cards have a translucent tinted fill, so a shadow drawn
          // beneath would bleed through and muddy the color — skip it and
          // rely on the border for definition instead.
          shadowOpacity: strong ? 0 : mode === "dark" ? 0 : 0.05,
          elevation: strong ? 0 : 1,
        },
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
  },
  padded: { padding: 18 },
});
