import React, { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import GlassCard from "../../components/GlassCard";
import DonutChart from "../../components/DonutChart";
import EmptyState from "../../components/EmptyState";
import FilterDropdown from "../../components/FilterDropdown";
import { useFlat } from "../../context/FlatContext";
import { BookApi, FlatApi } from "../../api/endpoints";
import { apiErrorMessage } from "../../api/client";
import { Book, Expense, FlatReport } from "../../types";
import { Palette, colorForCategories } from "../../theme/colors";
import { useTheme } from "../../theme/ThemeContext";
import type { AppStackParamList } from "../../navigation/types";

type Nav = NativeStackNavigationProp<AppStackParamList>;

function computeReport(expenses: Expense[]): FlatReport {
  const byCategory = new Map<string, number>();
  const byMember = new Map<number, { name: string; amount: number }>();
  let total = 0;

  for (const e of expenses) {
    const amount = Number(e.amount);
    total += amount;
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + amount);
    const prev = byMember.get(e.paidBy.id);
    byMember.set(e.paidBy.id, { name: e.paidBy.name, amount: (prev?.amount ?? 0) + amount });
  }

  return {
    total,
    expenseCount: expenses.length,
    byCategory: Array.from(byCategory.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
    byMember: Array.from(byMember.entries())
      .map(([userId, v]) => ({ userId, name: v.name, amount: v.amount }))
      .sort((a, b) => b.amount - a.amount),
  };
}

export default function HomeTabScreen() {
  const { flatId, flatName } = useFlat();
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [books, setBooks] = useState<Book[] | null>(null);
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const initializedSelection = useRef(false);

  const load = useCallback(async () => {
    try {
      const [booksRes, expensesRes] = await Promise.all([BookApi.list(flatId), FlatApi.expenses(flatId)]);
      setBooks(booksRes.data);
      setExpenses(expensesRes.data);

      if (!initializedSelection.current) {
        const openBook = booksRes.data.find((b) => b.status === "OPEN");
        setSelectedBookId(openBook?.id ?? null);
        initializedSelection.current = true;
      }
    } catch (err) {
      console.warn(apiErrorMessage(err));
    }
  }, [flatId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const openBook = books?.find((b) => b.status === "OPEN") ?? null;
  const selectedBook = books?.find((b) => b.id === selectedBookId) ?? null;

  const filteredExpenses = useMemo(() => {
    if (!expenses) return null;
    return selectedBookId == null ? expenses : expenses.filter((e) => e.bookId === selectedBookId);
  }, [expenses, selectedBookId]);

  const report = filteredExpenses ? computeReport(filteredExpenses) : null;

  const bookOptions = useMemo(
    () => [{ value: null, label: "All Books" }, ...(books ?? []).map((b) => ({ value: b.id, label: b.name }))],
    [books]
  );

  const categoryColors = report ? colorForCategories(report.byCategory.map((c) => c.category)) : new Map();
  const donutData =
    report?.byCategory.map((c) => ({
      label: c.category,
      value: c.amount,
      color: categoryColors.get(c.category) ?? colors.accent,
    })) ?? [];

  function handleAddExpense() {
    if (openBook) {
      navigation.navigate("AddExpense", { bookId: openBook.id, flatId });
    } else {
      navigation.navigate("CreateBook", { flatId });
    }
  }

  const hasBooks = !!books && books.length > 0;

  return (
    <Screen edges={[]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{flatName}</Text>
            <Text style={styles.subGreeting}>{openBook ? `Tracking "${openBook.name}"` : "No book active"}</Text>
          </View>
          {hasBooks && (
            <FilterDropdown label="Book" icon="book" value={selectedBookId} options={bookOptions} onChange={setSelectedBookId} />
          )}
        </View>

        {books === null && (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        )}

        {books !== null && !hasBooks && (
          <EmptyState
            icon="book"
            title="No Book Yet"
            subtitle="Create an expense book to start tracking"
            actionLabel="Create First Book"
            onAction={() => navigation.navigate("CreateBook", { flatId })}
            tint="accent"
          />
        )}

        {hasBooks && !report && (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        )}

        {hasBooks && report && report.expenseCount === 0 && (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No expenses yet{selectedBook ? ` in "${selectedBook.name}"` : ""} — tap the + button to add one.
            </Text>
          </GlassCard>
        )}

        {hasBooks && report && (
          <GlassCard style={styles.heroCard}>
            <Text style={styles.heroLabel}>Total spent</Text>
            <Text style={styles.heroValue}>₹{report.total.toFixed(2)}</Text>
            <Text style={styles.heroSubtitle}>
              {report.expenseCount} expense{report.expenseCount === 1 ? "" : "s"}
              {selectedBook ? ` in "${selectedBook.name}"` : " across all books"}
            </Text>
          </GlassCard>
        )}

        {hasBooks && report && report.expenseCount > 0 && (
          <GlassCard style={styles.chartCard}>
            <Text style={styles.sectionTitle}>By category</Text>
            <View style={styles.chartRow}>
              <DonutChart
                data={donutData}
                size={160}
                strokeWidth={24}
                centerValue={`₹${report.total.toFixed(0)}`}
                centerLabel="total"
              />
              <View style={styles.legend}>
                {report.byCategory.map((c) => {
                  const pct = report.total > 0 ? (c.amount / report.total) * 100 : 0;
                  return (
                    <View key={c.category} style={styles.legendRow}>
                      <View style={[styles.swatch, { backgroundColor: categoryColors.get(c.category) }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.legendLabel}>{c.category}</Text>
                        <Text style={styles.legendValue}>
                          ₹{c.amount.toFixed(2)} · {pct.toFixed(0)}%
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </GlassCard>
        )}

        {hasBooks && report && report.byMember.length > 0 && (
          <GlassCard style={styles.card}>
            <Text style={styles.sectionTitle}>Who's paid the most</Text>
            {report.byMember.map((m, i) => {
              const max = report.byMember[0].amount || 1;
              const pct = (m.amount / max) * 100;
              return (
                <View key={m.userId} style={styles.memberRow}>
                  <View style={styles.memberRowHeader}>
                    <Text style={styles.memberName}>
                      {i === 0 ? "🏆 " : ""}
                      {m.name}
                    </Text>
                    <Text style={styles.memberAmount}>₹{m.amount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${Math.max(pct, 4)}%` }]} />
                  </View>
                </View>
              );
            })}
          </GlassCard>
        )}
      </ScrollView>

      {hasBooks && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleAddExpense}
          style={[styles.fab, { backgroundColor: colors.accent }]}
        >
          <Feather name="plus" size={26} color={colors.onAccent} />
        </TouchableOpacity>
      )}
    </Screen>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    content: { padding: 20, paddingBottom: 100, gap: 16 },
    headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    greeting: { fontSize: 24, fontWeight: "800", color: c.textPrimary },
    subGreeting: { fontSize: 14, color: c.textSecondary, marginTop: 2, marginBottom: 4 },

    heroCard: { alignItems: "flex-start" },
    heroLabel: { color: c.textSecondary, fontWeight: "700", fontSize: 13 },
    heroValue: { color: c.textPrimary, fontWeight: "800", fontSize: 36, marginTop: 4 },
    heroSubtitle: { color: c.textSecondary, fontSize: 13, marginTop: 4 },

    loading: { paddingVertical: 30, alignItems: "center" },
    emptyCard: { alignItems: "center" },
    emptyText: { color: c.textSecondary, textAlign: "center", fontSize: 14 },

    card: {},
    chartCard: {},
    sectionTitle: { fontSize: 16, fontWeight: "800", color: c.textPrimary, marginBottom: 14 },
    chartRow: { flexDirection: "row", alignItems: "center", gap: 16 },
    legend: { flex: 1, gap: 10 },
    legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    swatch: { width: 10, height: 10, borderRadius: 3 },
    legendLabel: { fontSize: 13, fontWeight: "700", color: c.textPrimary },
    legendValue: { fontSize: 12, color: c.textSecondary, marginTop: 1 },

    memberRow: { marginBottom: 14 },
    memberRowHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
    memberName: { fontSize: 14, fontWeight: "700", color: c.textPrimary },
    memberAmount: { fontSize: 14, fontWeight: "700", color: c.textSecondary },
    track: { height: 8, borderRadius: 4, backgroundColor: c.divider, overflow: "hidden" },
    fill: { height: 8, borderRadius: 4, backgroundColor: c.accent },

    fab: {
      position: "absolute",
      right: 20,
      bottom: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 4,
    },
  });
}
