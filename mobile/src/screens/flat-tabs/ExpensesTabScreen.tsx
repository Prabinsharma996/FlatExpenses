import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import GlassCard from "../../components/GlassCard";
import GlassButton from "../../components/GlassButton";
import GlassInput from "../../components/GlassInput";
import EmptyState from "../../components/EmptyState";
import FilterDropdown from "../../components/FilterDropdown";
import { useFlat } from "../../context/FlatContext";
import { BookApi, FlatApi } from "../../api/endpoints";
import { apiErrorMessage } from "../../api/client";
import { Book, Expense, Flat } from "../../types";
import { Palette } from "../../theme/colors";
import { useTheme } from "../../theme/ThemeContext";
import type { AppStackParamList } from "../../navigation/types";

type Nav = NativeStackNavigationProp<AppStackParamList>;

export default function ExpensesTabScreen() {
  const { flatId, flatName } = useFlat();
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [flat, setFlat] = useState<Flat | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [paidByFilter, setPaidByFilter] = useState<number | null>(null);
  const [addedByFilter, setAddedByFilter] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [flatRes, expensesRes, booksRes] = await Promise.all([
        FlatApi.detail(flatId),
        FlatApi.expenses(flatId),
        BookApi.list(flatId),
      ]);
      setFlat(flatRes.data);
      setExpenses(expensesRes.data);
      setBooks(booksRes.data);
    } catch (err) {
      console.warn(apiErrorMessage(err));
    } finally {
      setLoaded(true);
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

  function handleAdd() {
    const openBook = books.find((b) => b.status === "OPEN");
    if (!openBook) {
      navigation.navigate("CreateBook", { flatId });
      return;
    }
    navigation.navigate("AddExpense", { bookId: openBook.id, flatId });
  }

  const categoryOptions = useMemo(() => {
    const cats = Array.from(new Set(expenses.map((e) => e.category))).sort((a, b) => a.localeCompare(b));
    return [{ value: null, label: "All Categories" }, ...cats.map((c) => ({ value: c, label: c }))];
  }, [expenses]);

  const memberOptions = useMemo(() => {
    const members = flat?.members ?? [];
    return [{ value: null, label: "Everyone" }, ...members.map((m) => ({ value: m.userId, label: m.user.name }))];
  }, [flat]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((e) => {
      if (categoryFilter != null && e.category !== categoryFilter) return false;
      if (paidByFilter != null && e.paidById !== paidByFilter) return false;
      if (addedByFilter != null && e.addedById !== addedByFilter) return false;
      if (q) {
        const haystack = `${e.category} ${e.remarks ?? ""} ${e.paidBy.name} ${e.addedBy.name}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [expenses, search, categoryFilter, paidByFilter, addedByFilter]);

  const filteredTotal = filtered.reduce((sum, e) => sum + Number(e.amount), 0);
  const filtersActive = !!search || categoryFilter != null || paidByFilter != null || addedByFilter != null;

  return (
    <Screen edges={[]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Expenses</Text>
          <Text style={styles.subtitle}>
            {filtered.length} expense{filtered.length === 1 ? "" : "s"} · ₹{filteredTotal.toFixed(2)} total
          </Text>
        </View>
        <GlassButton label="Add" icon="＋" onPress={handleAdd} style={styles.addBtn} />
      </View>

      <View style={styles.searchRow}>
        <Feather name="search" size={16} color={colors.textTertiary} style={styles.searchIcon} />
        <GlassInput
          placeholder="Search expenses..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.filterRow}>
        <FilterDropdown label="Category" icon="filter" value={categoryFilter} options={categoryOptions} onChange={setCategoryFilter} />
        <FilterDropdown label="Paid By" icon="user" value={paidByFilter} options={memberOptions} onChange={setPaidByFilter} />
        <FilterDropdown label="Added By" icon="user" value={addedByFilter} options={memberOptions} onChange={setAddedByFilter} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(e) => String(e.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loaded ? (
            <EmptyState
              icon="file-text"
              title="No expenses yet"
              subtitle={filtersActive ? "Adjust filters or tap Add to record an expense" : "Tap Add to record your first expense"}
            />
          ) : (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 30 }} />
          )
        }
        renderItem={({ item }) => (
          <GlassCard style={styles.expenseCard}>
            <View style={styles.expenseTop}>
              <Text style={styles.expenseCategory}>{item.category}</Text>
              <Text style={styles.expenseAmount}>₹{Number(item.amount).toFixed(2)}</Text>
            </View>
            <Text style={styles.expenseMeta}>
              Paid by {item.paidBy.name} · Added by {item.addedBy.name} · {new Date(item.createdAt).toLocaleDateString()}
            </Text>
            {!!item.remarks && <Text style={styles.expenseRemarks}>{item.remarks}</Text>}
            <View style={styles.expenseFooter}>
              <View style={[styles.bookBadge, item.book?.status === "CLOSED" && styles.bookBadgeClosed]}>
                <Text style={styles.bookBadgeText}>{item.book?.name ?? "Book"}</Text>
              </View>
              <Text style={styles.splitText}>Split {item.splits.length} way{item.splits.length === 1 ? "" : "s"}</Text>
            </View>
          </GlassCard>
        )}
      />
    </Screen>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 16 },
    title: { fontSize: 22, fontWeight: "800", color: c.textPrimary },
    subtitle: { fontSize: 12, color: c.textSecondary, marginTop: 4 },
    addBtn: { paddingHorizontal: 16, paddingVertical: 10 },

    searchRow: { position: "relative", justifyContent: "center", paddingHorizontal: 20, marginTop: 16 },
    searchIcon: { position: "absolute", left: 32, zIndex: 1 },
    searchInput: { paddingLeft: 38 },

    filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, marginTop: 12 },

    list: { padding: 20, paddingTop: 16, paddingBottom: 40, gap: 12 },

    expenseCard: {},
    expenseTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    expenseCategory: { fontSize: 16, fontWeight: "800", color: c.textPrimary },
    expenseAmount: { fontSize: 16, fontWeight: "800", color: c.accent },
    expenseMeta: { color: c.textSecondary, marginTop: 4, fontSize: 13 },
    expenseRemarks: { color: c.textTertiary, marginTop: 4, fontStyle: "italic", fontSize: 13 },
    expenseFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
    bookBadge: { backgroundColor: c.accentSoft, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
    bookBadgeClosed: { backgroundColor: c.divider },
    bookBadgeText: { fontSize: 11, fontWeight: "700", color: c.textPrimary },
    splitText: { fontSize: 12, color: c.textTertiary },
  });
}
