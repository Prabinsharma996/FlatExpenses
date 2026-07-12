import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

// iOS-style segmented control: gray track, active segment gets a raised white/card pill.
export default function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const { colors, mode } = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: colors.input }]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            activeOpacity={0.8}
            onPress={() => onChange(opt.value)}
            style={[
              styles.segment,
              active && {
                backgroundColor: colors.card,
                shadowOpacity: mode === "dark" ? 0 : 0.08,
              },
            ]}
          >
            <Text style={[styles.label, { color: active ? colors.textPrimary : colors.textSecondary }]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: "row", borderRadius: 14, padding: 4, gap: 4 },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  label: { fontWeight: "700", fontSize: 14 },
});
