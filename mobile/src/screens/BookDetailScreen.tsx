import React, { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../navigation/types";
import { BookApi, ExpenseApi } from "../api/endpoints";
import { apiErrorMessage } from "../api/client";
import { BookDetail, LiveBalances, Settlement } from "../types";
import { useAuth } from "../context/AuthContext";
import Screen from "../components/Screen";
import GlassCard from "../components/GlassCard";
import GlassButton from "../components/GlassButton";
import { Palette } from "../theme/colors";
import { useTheme } from "../theme/ThemeContext";
import { exportBookToExcel } from "../utils/exportBook";

type Props = NativeStackScreenProps<AppStackParamList, "BookDetail">;

function isLiveBalances(b: BookDetail["balances"]): b is LiveBalances {
  return !Array.isArray(b);
}

export default function BookDetailScreen({ route, navigation }: Props) {
  const { bookId, bookName, flatId } = route.params;
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [detail, setDetail] = useState<BookDetail | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await BookApi.detail(bookId);
      setDetail(data);
    } catch (err) {
      Alert.alert("Couldn't load book", apiErrorMessage(err));
    }
  }, [bookId]);

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ title: bookName });
      load();
    }, [load, navigation, bookName])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleCloseBook() {
    Alert.alert("Close book?", "This will lock the book and calculate the final settlement. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Close Book",
        style: "destructive",
        onPress: async () => {
          try {
            await BookApi.close(bookId);
            load();
          } catch (err) {
            Alert.alert("Couldn't close book", apiErrorMessage(err));
          }
        },
      },
    ]);
  }

  function handleDeleteExpense(expenseId: number) {
    Alert.alert("Delete Expense?", "Are you sure you want to remove this expense?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await ExpenseApi.remove(expenseId);
            load();
          } catch (err) {
            Alert.alert("Couldn't delete expense", apiErrorMessage(err));
          }
        },
      },
    ]);
  }

  async function handleShareCsv() {
    if (!detail) return;
    await exportBookToExcel(bookName, detail);
  }

  async function handleMarkPaid(settlementId: number | undefined) {
    if (!settlementId) return;
    try {
      await BookApi.markSettlementPaid(settlementId);
      load();
    } catch (err) {
      Alert.alert("Couldn't update settlement", apiErrorMessage(err));
    }
  }

  if (!detail) return <Screen edges={["bottom"]} />;

  const { book, expenses, balances } = detail;
  const live = isLiveBalances(balances) ? balances : null;
  const closedSettlements = !live ? (balances as Settlement[]) : null;

  return (
    <Screen edges={["bottom"]}>
      <FlatList
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        data={expenses}
        keyExtractor={(e) => String(e.id)}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <View style={[styles.statusBadge, book.status === "OPEN" ? styles.statusOpen : styles.statusClosed]}>
              <Text style={[styles.statusText, { color: book.status === "OPEN" ? colors.accent : colors.textSecondary }]}>
                {book.status === "OPEN" ? "Current" : "Closed"}
              </Text>
            </View>

            <GlassCard style={styles.card}>
              <Text style={styles.sectionTitle}>{book.status === "OPEN" ? "Live balances" : "Final settlement"}</Text>

              {live &&
                live.netByUser.map((nb) => (
                  <View key={nb.userId} style={styles.balanceRow}>
                    <Text style={styles.balanceName}>{nb.name}</Text>
                    <Text style={[styles.balanceAmount, { color: nb.net >= 0 ? colors.accent : colors.danger }]}>
                      {nb.net >= 0 ? `gets back ₹${nb.net.toFixed(2)}` : `owes ₹${Math.abs(nb.net).toFixed(2)}`}
                    </Text>
                  </View>
                ))}

              <Text style={styles.sectionSubTitle}>Who pays whom</Text>
              {(live?.transactions ?? closedSettlements ?? []).length === 0 && (
                <Text style={styles.empty}>Everyone's settled up.</Text>
              )}
              {(live?.transactions ?? closedSettlements ?? []).map((t, idx) => (
                <View key={t.id ?? idx} style={styles.transactionRow}>
                  <Text style={styles.transactionText}>
                    {t.fromUser?.name} → {t.toUser?.name}: ₹{Number(t.amount).toFixed(2)}
                  </Text>
                  {closedSettlements && t.status === "PENDING" && (t.fromUserId === user?.id || t.toUserId === user?.id) && (
                    <TouchableOpacity onPress={() => handleMarkPaid(t.id)}>
                      <Text style={styles.markPaid}>Mark paid</Text>
                    </TouchableOpacity>
                  )}
                  {closedSettlements && t.status === "PAID" && <Text style={styles.paidLabel}>Paid ✓</Text>}
                </View>
              ))}
            </GlassCard>

            {book.status === "OPEN" && (
              <View style={styles.actionsRow}>
                <GlassButton
                  label="Add Expense"
                  icon="＋"
                  onPress={() => navigation.navigate("AddExpense", { bookId, flatId })}
                  style={styles.flexBtn}
                />
                <GlassButton label="Close Book" variant="danger" onPress={handleCloseBook} style={styles.flexBtn} />
              </View>
            )}

            <GlassButton
              label="Share CSV"
              icon="📤"
              onPress={handleShareCsv}
              style={styles.shareBtn}
            />

            <Text style={styles.sectionTitle}>Expenses</Text>
          </View>
        }
        ListEmptyComponent={
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.empty}>No expenses yet.</Text>
          </GlassCard>
        }
        renderItem={({ item }) => (
          <GlassCard style={styles.expenseCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.expenseCategory}>{item.category}</Text>
              <Text style={styles.expenseMeta}>
                {item.paidBy.name} paid ₹{Number(item.amount).toFixed(2)}
              </Text>
              {!!item.remarks && <Text style={styles.expenseRemarks}>{item.remarks}</Text>}
              <Text style={styles.expenseSplit}>
                Split: {item.splits.map((s) => `${s.user.name} ₹${Number(s.shareAmount).toFixed(2)}`).join(", ")}
              </Text>
            </View>
            {book.status === "OPEN" && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, alignSelf: "flex-start" }}>
                <TouchableOpacity
                  onPress={() => navigation.navigate("AddExpense", { bookId: item.bookId, flatId, expenseToEdit: item })}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.75}
                >
                  <Feather name="edit-2" size={16} color={colors.accent} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteExpense(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.75}
                >
                  <Feather name="trash-2" size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            )}
          </GlassCard>
        )}
        contentContainerStyle={styles.list}
      />
    </Screen>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    headerWrap: { paddingHorizontal: 20, paddingTop: 12 },
    statusBadge: { alignSelf: "flex-start", borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10, marginBottom: 14 },
    statusOpen: { backgroundColor: c.accentSoft },
    statusClosed: { backgroundColor: c.divider },
    statusText: { fontSize: 12, fontWeight: "800" },
    card: { marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: "800", color: c.textPrimary, marginBottom: 8 },
    sectionSubTitle: { fontSize: 14, fontWeight: "700", color: c.textSecondary, marginTop: 12, marginBottom: 6 },
    balanceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
    balanceName: { fontSize: 15, color: c.textPrimary },
    balanceAmount: { fontSize: 15, fontWeight: "700" },
    transactionRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    transactionText: { fontSize: 14, color: c.textPrimary },
    markPaid: { color: c.accent, fontWeight: "700" },
    paidLabel: { color: c.accent, fontWeight: "700" },
    actionsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
    flexBtn: { flex: 1 },
    shareBtn: { marginBottom: 20 },
    empty: { textAlign: "center", color: c.textSecondary, marginTop: 10, marginBottom: 10 },
    emptyCard: { marginHorizontal: 20 },
    list: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
    expenseCard: { flexDirection: "row", alignItems: "flex-start" },
    expenseCategory: { fontSize: 15, fontWeight: "800", color: c.textPrimary },
    expenseMeta: { color: c.textSecondary, marginTop: 2 },
    expenseRemarks: { color: c.textTertiary, marginTop: 2, fontStyle: "italic" },
    expenseSplit: { color: c.textTertiary, marginTop: 4, fontSize: 12 },
    deleteText: { color: c.danger, fontWeight: "700" },
  });
}
