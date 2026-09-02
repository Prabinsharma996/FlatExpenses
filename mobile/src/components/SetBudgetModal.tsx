import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { BudgetApi, CategoryBudget } from "../api/endpoints";
import { useTheme } from "../theme/ThemeContext";
import { Palette } from "../theme/colors";
import GlassButton from "./GlassButton";

type Props = {
  visible: boolean;
  flatId: number;
  existingBudgets: CategoryBudget[];
  onClose: () => void;
  onSaved: () => void;
};

type BudgetEntry = {
  category: string;
  amountLimit: string;
};

export default function SetBudgetModal({
  visible,
  flatId,
  existingBudgets,
  onClose,
  onSaved,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatLimit, setNewCatLimit] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (existingBudgets && existingBudgets.length > 0) {
        setEntries(
          existingBudgets.map((b) => ({
            category: b.category,
            amountLimit: b.amountLimit ? String(b.amountLimit) : "0",
          }))
        );
      } else {
        setEntries([
          { category: "Groceries", amountLimit: "8000" },
          { category: "Electricity", amountLimit: "3000" },
          { category: "Internet", amountLimit: "1500" },
          { category: "Cleaning", amountLimit: "1000" },
          { category: "Other", amountLimit: "2000" },
        ]);
      }
      setNewCatName("");
      setNewCatLimit("");
    }
  }, [visible, existingBudgets]);

  function handleChangeLimit(index: number, val: string) {
    const next = [...entries];
    next[index].amountLimit = val;
    setEntries(next);
  }

  function handleRemoveCategory(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddCustomCategory() {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    if (entries.some((e) => e.category.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert("Exists", `"${trimmed}" is already in the budget list.`);
      return;
    }
    setEntries((prev) => [...prev, { category: trimmed, amountLimit: newCatLimit || "1000" }]);
    setNewCatName("");
    setNewCatLimit("");
  }

  const totalHouseholdLimit = useMemo(() => {
    return entries.reduce((sum, e) => sum + (parseFloat(e.amountLimit) || 0), 0);
  }, [entries]);

  async function handleSave() {
    setSaving(true);
    try {
      const payload = entries.map((e) => ({
        category: e.category,
        amountLimit: parseFloat(e.amountLimit) || 0,
      }));

      await BudgetApi.update(flatId, payload);
      Alert.alert("Budget Updated! 💰", "Household monthly budget saved successfully!");
      onSaved();
      onClose();
    } catch (err: any) {
      Alert.alert("Error saving budget", err?.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={{ fontSize: 22 }}>💰</Text>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Monthly Household Budget
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Feather name="x" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Set category limits for your flat. Get instant alerts before your group overspends!
            </Text>

            {/* Total Summary Header */}
            <View style={[styles.totalCard, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>TOTAL MONTHLY BUDGET</Text>
              <Text style={[styles.totalValue, { color: colors.accent }]}>
                ₹{totalHouseholdLimit.toLocaleString()}
              </Text>
            </View>

            {/* Category Rows */}
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>
              CATEGORY BUDGET LIMITS (₹)
            </Text>

            {entries.map((entry, idx) => (
              <View
                key={entry.category}
                style={[styles.row, { backgroundColor: colors.input, borderColor: colors.inputBorder }]}
              >
                <View style={styles.rowLeft}>
                  <Text style={[styles.catName, { color: colors.textPrimary }]}>{entry.category}</Text>
                </View>

                <View style={styles.rowRight}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, marginRight: 2 }}>₹</Text>
                  <TextInput
                    style={[styles.limitInput, { color: colors.textPrimary }]}
                    keyboardType="numeric"
                    value={entry.amountLimit}
                    onChangeText={(val) => handleChangeLimit(idx, val)}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TouchableOpacity
                    onPress={() => handleRemoveCategory(idx)}
                    style={{ padding: 4, marginLeft: 4 }}
                  >
                    <Feather name="trash-2" size={14} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Add Custom Category Row */}
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 14 }]}>
              + ADD CUSTOM CATEGORY BUDGET
            </Text>
            <View style={styles.addCustomRow}>
              <TextInput
                style={[
                  styles.customNameInput,
                  { color: colors.textPrimary, backgroundColor: colors.input, borderColor: colors.inputBorder },
                ]}
                placeholder="Category e.g. Repairs / Gym"
                placeholderTextColor={colors.textSecondary}
                value={newCatName}
                onChangeText={setNewCatName}
              />
              <TextInput
                style={[
                  styles.customLimitInput,
                  { color: colors.textPrimary, backgroundColor: colors.input, borderColor: colors.inputBorder },
                ]}
                placeholder="₹ Limit"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={newCatLimit}
                onChangeText={setNewCatLimit}
              />
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.accent }]}
                onPress={handleAddCustomCategory}
                activeOpacity={0.8}
              >
                <Feather name="plus" size={16} color={colors.onAccent} />
              </TouchableOpacity>
            </View>

            <GlassButton
              label={saving ? "Saving..." : "Save Household Budget 💾"}
              onPress={handleSave}
              disabled={saving}
              style={{ marginTop: 20 }}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.7)",
      justifyContent: "flex-end",
    },
    modalCard: {
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      maxHeight: "92%",
      padding: 20,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "800",
    },
    subtitle: {
      fontSize: 13,
      marginBottom: 14,
    },
    body: {
      paddingBottom: 24,
    },
    totalCard: {
      padding: 16,
      borderRadius: 18,
      borderWidth: 1.5,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 6,
    },
    totalLabel: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.5,
    },
    totalValue: {
      fontSize: 26,
      fontWeight: "900",
      marginTop: 2,
    },
    label: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 14,
      borderWidth: 1,
      marginBottom: 8,
    },
    rowLeft: {
      flex: 1,
    },
    catName: {
      fontSize: 14,
      fontWeight: "700",
    },
    rowRight: {
      flexDirection: "row",
      alignItems: "center",
    },
    limitInput: {
      width: 80,
      borderWidth: 1,
      borderColor: "rgba(150,150,150,0.3)",
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 6,
      fontSize: 14,
      fontWeight: "700",
      textAlign: "right",
    },
    addCustomRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    customNameInput: {
      flex: 2,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
    },
    customLimitInput: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 10,
      fontSize: 13,
    },
    addBtn: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
