import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { FlatApi, ShoppingApi } from "../../api/endpoints";
import GlassButton from "../../components/GlassButton";
import GlassCard from "../../components/GlassCard";
import Screen from "../../components/Screen";
import { useFlat } from "../../context/FlatContext";
import { useTheme } from "../../theme/ThemeContext";
import { Palette } from "../../theme/colors";
import { ExpenseBook, ShoppingItem } from "../../types";

export default function ShoppingTabScreen() {
  const { flatId } = useFlat();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [books, setBooks] = useState<ExpenseBook[]>([]);
  const [title, setTitle] = useState("");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [shoppingRes, flatRes] = await Promise.all([
        ShoppingApi.list(flatId),
        FlatApi.detail(flatId),
      ]);
      setItems(shoppingRes.data);
      if (flatRes.data.books) {
        setBooks(flatRes.data.books);
      }
    } catch (err: any) {
      console.warn("Failed to load shopping items", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [flatId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  async function handleAddItem() {
    if (!title.trim()) return;
    setAdding(true);
    try {
      await ShoppingApi.add(flatId, title.trim(), quantity.trim() || undefined);
      setTitle("");
      setQuantity("");
      loadData();
    } catch (err: any) {
      Alert.alert("Error adding item", err?.response?.data?.error || err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleToggleBought(itemId: number) {
    try {
      await ShoppingApi.toggle(itemId);
      loadData();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.error || err.message);
    }
  }

  async function handleDelete(itemId: number) {
    try {
      await ShoppingApi.remove(itemId);
      loadData();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.error || err.message);
    }
  }

  // Convert bought items into an Expense Split
  function handleConvertToExpense() {
    const openBook = books?.find((b) => b.status === "OPEN");
    if (!openBook) {
      Alert.alert("No Open Book", "Please create or open an expense book first.");
      return;
    }

    const boughtItems = items.filter((i) => i.isBought);
    const itemNames = boughtItems.map((i) => i.title).join(", ");

    navigation.navigate("AddExpense", {
      bookId: openBook.id,
      flatId: flatId,
      category: "Groceries / Shopping",
      remarks: itemNames ? `Shopping List: ${itemNames}` : "Shared Shopping Items",
    });
  }

  if (loading && !refreshing) {
    return (
      <Screen edges={[]}>
        <ActivityIndicator size="large" color={colors.accent} style={{ flex: 1 }} />
      </Screen>
    );
  }

  const boughtCount = items.filter((i) => i.isBought).length;

  return (
    <Screen edges={[]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Shared Shopping</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {boughtCount} of {items.length} items bought
          </Text>
        </View>

        {boughtCount > 0 && (
          <GlassButton
            label="Split Cost 💰"
            onPress={handleConvertToExpense}
            style={styles.convertBtn}
          />
        )}
      </View>

      {/* Add Item Input Card */}
      <GlassCard style={styles.inputCard}>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.input, borderColor: colors.inputBorder }]}
            placeholder="Add item e.g. Rice, Milk, Eggs..."
            placeholderTextColor={colors.textSecondary}
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.qtyInput, { color: colors.textPrimary, backgroundColor: colors.input, borderColor: colors.inputBorder }]}
            placeholder="Qty (e.g. 2kg)"
            placeholderTextColor={colors.textSecondary}
            value={quantity}
            onChangeText={setQuantity}
          />
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.accent }]}
            onPress={handleAddItem}
            disabled={adding || !title.trim()}
            activeOpacity={0.8}
          >
            {adding ? (
              <ActivityIndicator size="small" color={colors.onAccent} />
            ) : (
              <Feather name="plus" size={20} color={colors.onAccent} />
            )}
          </TouchableOpacity>
        </View>
      </GlassCard>

      {/* Items List */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="shopping-cart" size={44} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Shopping list is empty! Add items above.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <GlassCard style={styles.itemCard}>
            <TouchableOpacity
              style={styles.checkWrap}
              onPress={() => handleToggleBought(item.id)}
              activeOpacity={0.8}
            >
              <Feather
                name={item.isBought ? "check-square" : "square"}
                size={22}
                color={item.isBought ? colors.accent : colors.textSecondary}
              />
            </TouchableOpacity>

            <View style={styles.itemInfo}>
              <Text
                style={[
                  styles.itemTitle,
                  { color: item.isBought ? colors.textSecondary : colors.textPrimary },
                  item.isBought && styles.strikethrough,
                ]}
              >
                {item.title}
              </Text>
              <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                Added by {item.addedBy.name}
                {item.quantity ? ` • ${item.quantity}` : ""}
                {item.isBought && item.boughtBy ? ` • Bought by ${item.boughtBy.name}` : ""}
              </Text>
            </View>

            <TouchableOpacity onPress={() => handleDelete(item.id)} activeOpacity={0.7} style={{ padding: 4 }}>
              <Feather name="trash-2" size={16} color={colors.danger} />
            </TouchableOpacity>
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
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
    },
    title: {
      fontSize: 22,
      fontWeight: "800",
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 13,
      marginTop: 2,
    },
    convertBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
    },

    inputCard: {
      marginHorizontal: 20,
      marginTop: 8,
      marginBottom: 14,
      padding: 12,
    },
    inputRow: {
      flexDirection: "row",
      gap: 8,
    },
    input: {
      flex: 2,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
    },
    qtyInput: {
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

    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
      gap: 10,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
      gap: 12,
    },
    emptyText: {
      fontSize: 14,
      fontWeight: "600",
    },

    itemCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      gap: 12,
    },
    checkWrap: {
      padding: 2,
    },
    itemInfo: {
      flex: 1,
    },
    itemTitle: {
      fontSize: 15,
      fontWeight: "700",
    },
    strikethrough: {
      textDecorationLine: "line-through",
      opacity: 0.6,
    },
    itemMeta: {
      fontSize: 12,
      marginTop: 2,
    },
  });
}
