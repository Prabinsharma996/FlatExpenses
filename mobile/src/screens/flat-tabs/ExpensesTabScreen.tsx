import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import GlassCard from "../../components/GlassCard";
import GlassButton from "../../components/GlassButton";
import GlassInput from "../../components/GlassInput";
import EmptyState from "../../components/EmptyState";
import MultiFilterDropdown from "../../components/MultiFilterDropdown";
import { useFlat } from "../../context/FlatContext";
import { BookApi, ExpenseApi, FlatApi } from "../../api/endpoints";
import { apiErrorMessage } from "../../api/client";
import { Book, Expense, Flat } from "../../types";
import { Palette } from "../../theme/colors";
import { useTheme } from "../../theme/ThemeContext";
import type { AppStackParamList } from "../../navigation/types";

type Nav = NativeStackNavigationProp<AppStackParamList>;

export default function ExpensesTabScreen() {
  const { flatId } = useFlat();
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [flat, setFlat] = useState<Flat | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [paidByFilter, setPaidByFilter] = useState<number[]>([]);
  const [addedByFilter, setAddedByFilter] = useState<number[]>([]);

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
    const openBooks = books.filter((b) => b.status === "OPEN");
    if (openBooks.length === 0) {
      navigation.navigate("CreateBook", { flatId });
      return;
    }
    const targetBookId = selectedBookId && openBooks.some((b) => b.id === selectedBookId)
      ? selectedBookId
      : openBooks[0].id;

    navigation.navigate("AddExpense", { bookId: targetBookId, flatId });
  }

  const categoryOptions = useMemo(() => {
    const cats = Array.from(new Set(expenses.map((e) => e.category))).sort((a, b) => a.localeCompare(b));
    return cats.map((c) => ({ value: c, label: c }));
  }, [expenses]);

  const memberOptions = useMemo(() => {
    const members = flat?.members ?? [];
    return members.map((m) => ({ value: m.userId, label: m.user.name }));
  }, [flat]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((e) => {
      if (selectedBookId !== null && e.bookId !== selectedBookId) return false;
      if (categoryFilter.length > 0 && !categoryFilter.includes(e.category)) return false;
      if (paidByFilter.length > 0 && !paidByFilter.includes(e.paidById)) return false;
      if (addedByFilter.length > 0 && !addedByFilter.includes(e.addedById)) return false;
      if (q) {
        const haystack = `${e.category} ${e.remarks ?? ""} ${e.paidBy.name} ${e.addedBy.name}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [expenses, selectedBookId, search, categoryFilter, paidByFilter, addedByFilter]);

  const filteredTotal = useMemo(() => {
    return filtered.reduce((sum, e) => sum + Number(e.amount), 0);
  }, [filtered]);

  const hasActiveFilters =
    selectedBookId !== null ||
    search.trim() !== "" ||
    categoryFilter.length > 0 ||
    paidByFilter.length > 0 ||
    addedByFilter.length > 0;

  function clearAllFilters() {
    setSelectedBookId(null);
    setSearch("");
    setCategoryFilter([]);
    setPaidByFilter([]);
    setAddedByFilter([]);
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
            setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
          } catch (err) {
            Alert.alert("Couldn't delete expense", apiErrorMessage(err));
          }
        },
      },
    ]);
  }

  return (
    <Screen edges={[]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Expenses</Text>
          <Text style={styles.subtitle}>View & split expenses with flat members</Text>
        </View>
        <GlassButton label="Add" icon="＋" onPress={handleAdd} style={styles.addBtn} />
      </View>

      {/* ── Expense Book Filter Selector ── */}
      {books.length > 0 && (
        <View style={styles.bookSelectorWrapper}>
          <Text style={[styles.bookSelectorLabel, { color: colors.textSecondary }]}>CHOOSE EXPENSE BOOK:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bookChipsRow}>
            <TouchableOpacity
              style={[
                styles.bookChip,
                { backgroundColor: selectedBookId === null ? colors.accent : colors.card, borderColor: colors.cardBorder },
              ]}
              onPress={() => setSelectedBookId(null)}
              activeOpacity={0.8}
            >
              <Feather name="book-open" size={13} color={selectedBookId === null ? colors.onAccent : colors.textPrimary} />
              <Text style={[styles.bookChipText, { color: selectedBookId === null ? colors.onAccent : colors.textPrimary }]}>
                All Books ({books.length})
              </Text>
            </TouchableOpacity>

            {books.map((b) => {
              const active = selectedBookId === b.id;
              const isOpen = b.status === "OPEN";
              return (
                <TouchableOpacity
                  key={b.id}
                  style={[
                    styles.bookChip,
                    { backgroundColor: active ? colors.accent : colors.card, borderColor: colors.cardBorder },
                  ]}
                  onPress={() => setSelectedBookId(b.id)}
                  activeOpacity={0.8}
                >
                  <Feather
                    name={isOpen ? "book" : "lock"}
                    size={13}
                    color={active ? colors.onAccent : isOpen ? colors.accent : colors.textSecondary}
                  />
                  <Text style={[styles.bookChipText, { color: active ? colors.onAccent : colors.textPrimary }]}>
                    {b.name} {isOpen ? "" : "(Closed)"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Search Bar ── */}
      <View style={styles.searchRow}>
        <Feather name="search" size={16} color={colors.textTertiary} style={styles.searchIcon} />
        <GlassInput
          placeholder="Search expenses..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      {/* ── Multi-Select Filters Row ── */}
      <View style={styles.filterRow}>
        <MultiFilterDropdown
          label="Category"
          icon="filter"
          selectedValues={categoryFilter}
          options={categoryOptions}
          onChange={setCategoryFilter}
        />
        <MultiFilterDropdown
          label="Paid By"
          icon="user"
          selectedValues={paidByFilter}
          options={memberOptions}
          onChange={setPaidByFilter}
        />
        <MultiFilterDropdown
          label="Added By"
          icon="user-check"
          selectedValues={addedByFilter}
          options={memberOptions}
          onChange={setAddedByFilter}
        />
      </View>

      {/* ── Total Sum Banner / Summary Card ── */}
      <View style={styles.summaryContainer}>
        <GlassCard style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryLabel}>
                {hasActiveFilters ? "FILTERED EXPENSES TOTAL" : "TOTAL EXPENSES AMOUNT"}
              </Text>
              <Text style={styles.summaryValue}>
                ₹{filteredTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>

            <View style={styles.summaryRight}>
              <View style={[styles.countBadge, { backgroundColor: colors.accentSoft }]}>
                <Text style={[styles.countBadgeText, { color: colors.accent }]}>
                  {filtered.length} {filtered.length === 1 ? "expense" : "expenses"}
                </Text>
              </View>
              {hasActiveFilters && (
                <TouchableOpacity style={styles.clearBtn} onPress={clearAllFilters} activeOpacity={0.75}>
                  <Feather name="rotate-ccw" size={12} color={colors.danger} />
                  <Text style={[styles.clearBtnText, { color: colors.danger }]}>Reset</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Active Filter Badges */}
          {hasActiveFilters && (
            <View style={styles.activePillsContainer}>
              {selectedBookId !== null && (
                <View style={[styles.activePill, { backgroundColor: colors.accentSoft }]}>
                  <Text style={[styles.activePillText, { color: colors.accent }]}>
                    Book: {books.find((b) => b.id === selectedBookId)?.name}
                  </Text>
                </View>
              )}
              {paidByFilter.length > 0 && (
                <View style={[styles.activePill, { backgroundColor: colors.input }]}>
                  <Text style={[styles.activePillText, { color: colors.textPrimary }]}>
                    Paid: {paidByFilter.map((id) => flat?.members.find((m) => m.userId === id)?.user.name).filter(Boolean).join(", ")}
                  </Text>
                </View>
              )}
              {addedByFilter.length > 0 && (
                <View style={[styles.activePill, { backgroundColor: colors.input }]}>
                  <Text style={[styles.activePillText, { color: colors.textPrimary }]}>
                    Added: {addedByFilter.map((id) => flat?.members.find((m) => m.userId === id)?.user.name).filter(Boolean).join(", ")}
                  </Text>
                </View>
              )}
              {categoryFilter.length > 0 && (
                <View style={[styles.activePill, { backgroundColor: colors.input }]}>
                  <Text style={[styles.activePillText, { color: colors.textPrimary }]}>
                    Cat: {categoryFilter.join(", ")}
                  </Text>
                </View>
              )}
            </View>
          )}
        </GlassCard>
      </View>

      {/* ── Expense List ── */}
      <FlatList
        data={filtered}
        keyExtractor={(e) => String(e.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loaded ? (
            <EmptyState
              icon="file-text"
              title="No expenses found"
              subtitle={hasActiveFilters ? "Try adjusting your filters or search term" : "Tap Add to record your first expense"}
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
              Paid by <Text style={{ fontWeight: "700" }}>{item.paidBy.name}</Text> · Added by <Text style={{ fontWeight: "700" }}>{item.addedBy.name}</Text> · {new Date(item.createdAt).toLocaleDateString()}
            </Text>
            {!!item.remarks && <Text style={styles.expenseRemarks}>{item.remarks}</Text>}
            <View style={styles.expenseFooter}>
              <View style={[styles.bookBadge, item.book?.status === "CLOSED" && styles.bookBadgeClosed]}>
                <Text style={styles.bookBadgeText}>{item.book?.name ?? "Book"}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Text style={styles.splitText}>Split {item.splits.length} way{item.splits.length === 1 ? "" : "s"}</Text>
                {item.book?.status !== "CLOSED" && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => navigation.navigate("AddExpense", { bookId: item.bookId, flatId, expenseToEdit: item })}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.75}
                    >
                      <Feather name="edit-2" size={14} color={colors.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteExpense(item.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.75}
                    >
                      <Feather name="trash-2" size={14} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </GlassCard>
        )}
      />
    </Screen>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    title: { fontSize: 22, fontWeight: "800", color: c.textPrimary },
    subtitle: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    addBtn: { paddingHorizontal: 16, paddingVertical: 10 },

    bookSelectorWrapper: {
      paddingHorizontal: 20,
      marginTop: 12,
    },
    bookSelectorLabel: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    bookChipsRow: {
      gap: 8,
    },
    bookChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 12,
      borderWidth: 1,
    },
    bookChipText: {
      fontSize: 12,
      fontWeight: "700",
    },

    searchRow: { position: "relative", justifyContent: "center", paddingHorizontal: 20, marginTop: 12 },
    searchIcon: { position: "absolute", left: 32, zIndex: 1 },
    searchInput: { paddingLeft: 38 },

    filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, marginTop: 10 },

    summaryContainer: { paddingHorizontal: 20, marginTop: 12 },
    summaryCard: { padding: 14 },
    summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    summaryLabel: { fontSize: 11, fontWeight: "800", color: c.textSecondary, letterSpacing: 0.5 },
    summaryValue: { fontSize: 24, fontWeight: "800", color: c.accent, marginTop: 2 },
    summaryRight: { alignItems: "flex-end", gap: 6 },
    countBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
    countBadgeText: { fontSize: 12, fontWeight: "700" },
    clearBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 2 },
    clearBtnText: { fontSize: 12, fontWeight: "700" },

    activePillsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 10,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    activePill: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 },
    activePillText: { fontSize: 11, fontWeight: "600" },

    list: { padding: 20, paddingTop: 12, paddingBottom: 40, gap: 12 },

    expenseCard: { padding: 14 },
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
