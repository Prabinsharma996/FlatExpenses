import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../navigation/types";
import { ExpenseApi, FlatApi } from "../api/endpoints";
import { apiErrorMessage } from "../api/client";
import { Flat, SplitType } from "../types";
import { useAuth } from "../context/AuthContext";
import Screen from "../components/Screen";
import GlassInput from "../components/GlassInput";
import { Palette } from "../theme/colors";
import { useTheme } from "../theme/ThemeContext";

type Props = NativeStackScreenProps<AppStackParamList, "AddExpense">;

const CATEGORIES = [
  { label: "Rent", icon: "home" },
  { label: "Food", icon: "coffee" },
  { label: "Groceries", icon: "shopping-cart" },
  { label: "Vegetables", icon: "package" },
  { label: "Utilities", icon: "zap" },
  { label: "Internet", icon: "wifi" },
  { label: "Transport", icon: "truck" },
  { label: "Snacks", icon: "smile" },
  { label: "Others", icon: "more-horizontal" },
] as const;

const SPLIT_OPTIONS: { value: SplitType; label: string; desc: string }[] = [
  { value: "EQUAL", label: "Equal Split", desc: "Split evenly among members" },
  { value: "EXACT", label: "Custom Split", desc: "Enter exact amounts per person" },
  { value: "PERCENTAGE", label: "By %", desc: "Enter percentage per person" },
];

export default function AddExpenseScreen({ route, navigation }: Props) {
  const { bookId, flatId } = route.params;
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [flat, setFlat] = useState<Flat | null>(null);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [remarks, setRemarks] = useState("");
  const [paidById, setPaidById] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [splitType, setSplitType] = useState<SplitType>("EQUAL");
  const [exactAmounts, setExactAmounts] = useState<Record<number, string>>({});
  const [percentages, setPercentages] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPaidByModal, setShowPaidByModal] = useState(false);

  const totalPercentage = useMemo(() => {
    return Array.from(selectedIds).reduce((sum, id) => sum + Number(percentages[id] || 0), 0);
  }, [selectedIds, percentages]);

  const paidByMember = flat?.members.find((m) => m.userId === paidById);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await FlatApi.detail(flatId);
        setFlat(data);
        const allIds = data.members.map((m) => m.userId);
        setSelectedIds(new Set(allIds));
        setPaidById(user?.id ?? allIds[0] ?? null);
      } catch (err) {
        Alert.alert("Couldn't load flat members", apiErrorMessage(err));
      }
    })();
  }, [flatId, user?.id]);

  function toggleMember(userId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function handleSubmit() {
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid amount.");
      return;
    }
    if (!category.trim()) {
      Alert.alert("Category required", "Please select or enter a category.");
      return;
    }
    if (selectedIds.size === 0) {
      Alert.alert("No members selected", "Select at least one person to split with.");
      return;
    }
    if (!paidById) return;

    if (splitType === "PERCENTAGE" && Math.abs(totalPercentage - 100) > 0.01) {
      Alert.alert("Invalid percentages", `Percentages must add up to 100% (currently ${totalPercentage}%).`);
      return;
    }

    const participants =
      splitType === "EQUAL"
        ? Array.from(selectedIds).map((userId) => ({ userId }))
        : splitType === "EXACT"
        ? Array.from(selectedIds).map((userId) => ({ userId, value: Number(exactAmounts[userId] || 0) }))
        : Array.from(selectedIds).map((userId) => ({ userId, value: Number(percentages[userId] || 0) }));

    setLoading(true);
    try {
      await ExpenseApi.create(bookId, {
        amount: numericAmount,
        category: category.trim(),
        remarks: remarks.trim() || undefined,
        paidById,
        splitType,
        participants,
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert("Couldn't add expense", apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (!flat) {
    return <Screen edges={["bottom"]} />;
  }

  return (
    <Screen edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Amount ── */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={styles.sectionLabel}>Amount (₹)</Text>
          <TextInput
            style={[styles.amountInput, { color: numericVal(amount) > 0 ? colors.textPrimary : colors.textTertiary }]}
            placeholder="0.00"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        {/* ── Category ── */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={styles.sectionLabel}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {CATEGORIES.map((c) => {
              const selected = category === c.label;
              return (
                <TouchableOpacity
                  key={c.label}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: selected ? colors.accent : colors.input,
                      borderColor: selected ? colors.accent : colors.inputBorder,
                    },
                  ]}
                  onPress={() => setCategory(c.label)}
                  activeOpacity={0.75}
                >
                  <Feather name={c.icon as any} size={13} color={selected ? colors.onAccent : colors.textSecondary} />
                  <Text style={[styles.categoryChipText, { color: selected ? colors.onAccent : colors.textPrimary }]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {/* Custom category input */}
          <GlassInput
            placeholder="Or type a custom category…"
            value={CATEGORIES.some((c) => c.label === category) ? "" : category}
            onChangeText={(v) => setCategory(v)}
            style={styles.customCatInput}
          />
        </View>

        {/* ── Paid By ── */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={styles.sectionLabel}>Paid by</Text>
          <TouchableOpacity
            style={[styles.dropdown, { backgroundColor: colors.input, borderColor: colors.inputBorder }]}
            onPress={() => setShowPaidByModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.dropdownLeft}>
              <View style={[styles.memberDot, { backgroundColor: colors.accentSoft }]}>
                <Text style={[styles.memberInitial, { color: colors.accent }]}>
                  {paidByMember?.user.name?.charAt(0).toUpperCase() ?? "?"}
                </Text>
              </View>
              <Text style={[styles.dropdownText, { color: colors.textPrimary }]}>
                {paidByMember?.user.name ?? "Select member"}
              </Text>
            </View>
            <Feather name="chevron-down" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ── Split Between ── */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={styles.sectionLabel}>Split between</Text>
          <View style={styles.memberRow}>
            {flat.members.map((m) => {
              const selected = selectedIds.has(m.userId);
              return (
                <TouchableOpacity
                  key={m.userId}
                  style={[
                    styles.memberChip,
                    {
                      backgroundColor: selected ? colors.accent : colors.input,
                      borderColor: selected ? colors.accent : colors.inputBorder,
                    },
                  ]}
                  onPress={() => toggleMember(m.userId)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.memberChipText, { color: selected ? colors.onAccent : colors.textPrimary }]}>
                    {m.user.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Split type toggle */}
          <View style={[styles.splitToggle, { backgroundColor: colors.input }]}>
            {SPLIT_OPTIONS.map((opt) => {
              const active = splitType === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.splitBtn, active && { backgroundColor: colors.accent }]}
                  onPress={() => setSplitType(opt.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.splitBtnText, { color: active ? colors.onAccent : colors.textSecondary }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom split inputs */}
          {splitType !== "EQUAL" && (
            <View style={styles.customSplitContainer}>
              {Array.from(selectedIds).map((userId) => {
                const member = flat.members.find((m) => m.userId === userId);
                if (!member) return null;
                const isPercent = splitType === "PERCENTAGE";
                return (
                  <View key={userId} style={[styles.customSplitRow, { borderBottomColor: colors.divider }]}>
                    <View style={styles.customSplitLeft}>
                      <View style={[styles.memberDot, { backgroundColor: colors.accentSoft }]}>
                        <Text style={[styles.memberInitial, { color: colors.accent }]}>
                          {member.user.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.customSplitName, { color: colors.textPrimary }]}>{member.user.name}</Text>
                    </View>
                    <View style={styles.customSplitInputWrap}>
                      {!isPercent && (
                        <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>₹</Text>
                      )}
                      <TextInput
                        style={[styles.customSplitInput, { color: colors.textPrimary, borderColor: colors.inputBorder, backgroundColor: colors.input }]}
                        placeholder="0"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="numeric"
                        value={isPercent ? (percentages[userId] ?? "") : (exactAmounts[userId] ?? "")}
                        onChangeText={(v) =>
                          isPercent
                            ? setPercentages((prev) => ({ ...prev, [userId]: v }))
                            : setExactAmounts((prev) => ({ ...prev, [userId]: v }))
                        }
                      />
                      {isPercent && (
                        <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>%</Text>
                      )}
                    </View>
                  </View>
                );
              })}

              {splitType === "PERCENTAGE" && (
                <View style={[styles.pctSummary, { backgroundColor: Math.abs(totalPercentage - 100) < 0.01 ? colors.accentSoft : colors.dangerSoft }]}>
                  <Feather
                    name={Math.abs(totalPercentage - 100) < 0.01 ? "check-circle" : "alert-circle"}
                    size={14}
                    color={Math.abs(totalPercentage - 100) < 0.01 ? colors.accent : colors.danger}
                  />
                  <Text style={[styles.pctSummaryText, { color: Math.abs(totalPercentage - 100) < 0.01 ? colors.accent : colors.danger }]}>
                    {Math.abs(totalPercentage - 100) < 0.01
                      ? "Percentages add up to 100% ✓"
                      : `Total: ${totalPercentage}% — must equal 100%`}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Remarks ── */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={styles.sectionLabel}>Remarks (optional)</Text>
          <GlassInput
            placeholder="e.g. Big Bazaar run, monthly rent…"
            value={remarks}
            onChangeText={setRemarks}
            multiline
            numberOfLines={2}
            style={styles.remarksInput}
          />
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            {
              backgroundColor:
                !amount || !category.trim() || selectedIds.size === 0
                  ? colors.accentSoft
                  : colors.accent,
            },
          ]}
          onPress={handleSubmit}
          disabled={loading || !amount || !category.trim() || selectedIds.size === 0}
          activeOpacity={0.85}
        >
          {loading ? (
            <Text style={[styles.submitText, { color: colors.onAccent }]}>Adding…</Text>
          ) : (
            <>
              <Feather name="plus-circle" size={18} color={colors.onAccent} />
              <Text style={[styles.submitText, { color: colors.onAccent }]}>Add Expense</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Paid By Modal */}
      <Modal visible={showPaidByModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPaidByModal(false)} />
        <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.divider }]} />
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Who paid?</Text>
          <FlatList
            data={flat.members}
            keyExtractor={(m) => String(m.userId)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  { borderBottomColor: colors.divider },
                  paidById === item.userId && { backgroundColor: colors.accentSoft },
                ]}
                onPress={() => {
                  setPaidById(item.userId);
                  setShowPaidByModal(false);
                }}
                activeOpacity={0.75}
              >
                <View style={[styles.memberDot, { backgroundColor: colors.accentSoft }]}>
                  <Text style={[styles.memberInitial, { color: colors.accent }]}>
                    {item.user.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.modalItemText, { color: colors.textPrimary }]}>{item.user.name}</Text>
                {paidById === item.userId && (
                  <Feather name="check" size={16} color={colors.accent} style={{ marginLeft: "auto" }} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </Screen>
  );
}

function numericVal(s: string) {
  return Number(s) || 0;
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    scroll: { padding: 16, paddingBottom: 40, gap: 12 },

    section: {
      borderRadius: 18,
      borderWidth: 1,
      padding: 16,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: c.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 12,
    },

    // Amount
    amountInput: {
      fontSize: 42,
      fontWeight: "800",
      letterSpacing: -1,
      textAlign: "center",
      paddingVertical: 10,
    },

    // Categories
    categoryRow: { gap: 8, paddingBottom: 4 },
    categoryChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
    },
    categoryChipText: { fontSize: 13, fontWeight: "600" },
    customCatInput: { marginTop: 10 },

    // Dropdown
    dropdown: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
    },
    dropdownLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    dropdownText: { fontSize: 15, fontWeight: "600" },

    // Members
    memberRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
    memberChip: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 999,
      borderWidth: 1,
    },
    memberChipText: { fontSize: 13, fontWeight: "600" },
    memberDot: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
    },
    memberInitial: { fontSize: 13, fontWeight: "800" },

    // Split toggle
    splitToggle: {
      flexDirection: "row",
      borderRadius: 12,
      padding: 4,
      gap: 4,
    },
    splitBtn: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 9,
      alignItems: "center",
    },
    splitBtnText: { fontSize: 12, fontWeight: "700" },

    // Custom split
    customSplitContainer: { marginTop: 14, gap: 2 },
    customSplitRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    customSplitLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    customSplitName: { fontSize: 14, fontWeight: "600" },
    customSplitInputWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
    currencySymbol: { fontSize: 14, fontWeight: "700" },
    customSplitInput: {
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 12,
      fontSize: 14,
      fontWeight: "700",
      width: 80,
      textAlign: "right",
    },

    // Percentage summary banner
    pctSummary: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 12,
      padding: 10,
      borderRadius: 10,
    },
    pctSummaryText: { fontSize: 12, fontWeight: "700", flex: 1 },

    // Remarks
    remarksInput: { minHeight: 60, textAlignVertical: "top" },

    // Submit
    submitBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 18,
      paddingVertical: 18,
      marginTop: 4,
    },
    submitText: { fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
    modalSheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: 40,
      maxHeight: "60%",
    },
    modalHandle: { width: 40, height: 4, borderRadius: 4, alignSelf: "center", marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 12 },
    modalItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    modalItemText: { fontSize: 15, fontWeight: "600" },
  });
}
