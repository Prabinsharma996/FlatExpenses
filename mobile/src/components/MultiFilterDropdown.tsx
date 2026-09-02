import React, { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";

export type MultiFilterOption<T extends string | number> = { value: T; label: string };

type Props<T extends string | number> = {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  selectedValues: T[];
  options: MultiFilterOption<T>[];
  onChange: (values: T[]) => void;
};

export default function MultiFilterDropdown<T extends string | number>({
  label,
  icon,
  selectedValues,
  options,
  onChange,
}: Props<T>) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  // Helper for label display
  let triggerText = label;
  if (selectedValues.length > 0) {
    if (selectedValues.length === 1) {
      const match = options.find((o) => o.value === selectedValues[0]);
      triggerText = match ? `${label}: ${match.label}` : label;
    } else {
      triggerText = `${label} (${selectedValues.length})`;
    }
  }

  const isAllSelected = selectedValues.length === 0;

  function toggleOption(val: T) {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  }

  function handleSelectAll() {
    onChange([]);
  }

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => setOpen(true)}
        style={[
          styles.trigger,
          {
            backgroundColor: selectedValues.length > 0 ? colors.accentSoft : colors.card,
            borderColor: selectedValues.length > 0 ? colors.accent : colors.cardBorder,
          },
        ]}
      >
        {icon && (
          <Feather
            name={icon}
            size={13}
            color={selectedValues.length > 0 ? colors.accent : colors.textSecondary}
            style={styles.triggerIcon}
          />
        )}
        <Text
          numberOfLines={1}
          style={[
            styles.triggerLabel,
            { color: selectedValues.length > 0 ? colors.accent : colors.textPrimary },
          ]}
        >
          {triggerText}
        </Text>
        <Feather
          name="chevron-down"
          size={14}
          color={selectedValues.length > 0 ? colors.accent : colors.textTertiary}
        />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Filter by {label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.doneBtn}>
                <Text style={[styles.doneText, { color: colors.accent }]}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.actionRow, { borderBottomColor: colors.divider }]}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleSelectAll}
                activeOpacity={0.7}
              >
                <Feather
                  name={isAllSelected ? "check-circle" : "circle"}
                  size={14}
                  color={isAllSelected ? colors.accent : colors.textSecondary}
                />
                <Text style={[styles.actionText, { color: isAllSelected ? colors.accent : colors.textSecondary }]}>
                  All ({label})
                </Text>
              </TouchableOpacity>

              {selectedValues.length > 0 && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => onChange([])}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.actionText, { color: colors.danger }]}>Clear filter</Text>
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={options}
              keyExtractor={(o) => String(o.value)}
              contentContainerStyle={{ paddingVertical: 6 }}
              renderItem={({ item }) => {
                const checked = selectedValues.includes(item.value);
                return (
                  <TouchableOpacity
                    style={[styles.optionRow, { borderBottomColor: colors.divider }]}
                    onPress={() => toggleOption(item.value)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionLeft}>
                      <Feather
                        name={checked ? "check-square" : "square"}
                        size={18}
                        color={checked ? colors.accent : colors.textTertiary}
                      />
                      <Text
                        style={[
                          styles.optionLabel,
                          { color: checked ? colors.textPrimary : colors.textSecondary, fontWeight: checked ? "700" : "500" },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
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
    gap: 5,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    maxWidth: 140,
  },
  triggerIcon: { marginRight: 1 },
  triggerLabel: { fontSize: 12, fontWeight: "600", flexShrink: 1 },
  backdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: "65%",
    padding: 18,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 16, fontWeight: "800" },
  doneBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  doneText: { fontSize: 15, fontWeight: "800" },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    borderBottomWidth: 1,
    marginBottom: 6,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
  actionText: { fontSize: 13, fontWeight: "700" },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  optionLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  optionLabel: { fontSize: 15 },
});
