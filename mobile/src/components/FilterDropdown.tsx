import React, { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";

export type FilterOption<T extends string | number | null> = { value: T; label: string };

type Props<T extends string | number | null> = {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  value: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
};

// Button + Modal option list — stands in for a native <select> for the
// Category / Paid By / Added By filters on the Expenses tab.
export default function FilterDropdown<T extends string | number | null>({ label, icon, value, options, onChange }: Props<T>) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label ?? label;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => setOpen(true)}
        style={[styles.trigger, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      >
        {icon && <Feather name={icon} size={13} color={colors.textSecondary} style={styles.triggerIcon} />}
        <Text numberOfLines={1} style={[styles.triggerLabel, { color: colors.textPrimary }]}>
          {current}
        </Text>
        <Feather name="chevron-down" size={14} color={colors.textTertiary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(o) => String(o.value)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.optionLabel, { color: item.value === value ? colors.accent : colors.textPrimary }]}>
                    {item.label}
                  </Text>
                  {item.value === value && <Feather name="check" size={16} color={colors.accent} />}
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    maxWidth: 130,
  },
  triggerIcon: { marginRight: 1 },
  triggerLabel: { fontSize: 12, fontWeight: "600", flexShrink: 1 },
  backdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderBottomWidth: 0, maxHeight: "60%", padding: 16 },
  sheetTitle: { fontSize: 15, fontWeight: "800", marginBottom: 8 },
  option: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  optionLabel: { fontSize: 15, fontWeight: "600" },
});
