import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import GlassCard from "../../components/GlassCard";
import GlassButton from "../../components/GlassButton";
import EmptyState from "../../components/EmptyState";
import { useFlat } from "../../context/FlatContext";
import { useAuth } from "../../context/AuthContext";
import { BookApi, FlatApi } from "../../api/endpoints";
import { apiErrorMessage } from "../../api/client";
import { Book, Flat } from "../../types";
import { Palette } from "../../theme/colors";
import { useTheme } from "../../theme/ThemeContext";
import type { AppStackParamList } from "../../navigation/types";

type Nav = NativeStackNavigationProp<AppStackParamList>;

export default function BooksTabScreen() {
  const { flatId, flatName } = useFlat();
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [books, setBooks] = useState<Book[]>([]);
  const [flat, setFlat] = useState<Flat | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [booksRes, flatRes] = await Promise.all([BookApi.list(flatId), FlatApi.detail(flatId)]);
      setBooks(booksRes.data);
      setFlat(flatRes.data);
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

  const isAdmin = !!flat && !!user && flat.adminId === user.id;

  function handleCloseBook(bookId: number) {
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

  return (
    <Screen edges={[]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Books</Text>
          <Text style={styles.subtitle}>Every expense period, past and present</Text>
        </View>
        <GlassButton label="Add Book" icon="＋" onPress={() => navigation.navigate("CreateBook", { flatId })} style={styles.newBtn} />
      </View>

      <FlatList
        data={books}
        keyExtractor={(b) => String(b.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loaded ? (
            <EmptyState icon="book-open" title="No Books Yet" subtitle="Start one to begin tracking expenses." />
          ) : (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 30 }} />
          )
        }
        renderItem={({ item }) => {
          const isOpen = item.status === "OPEN";
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate("BookDetail", { bookId: item.id, bookName: item.name, flatId })}
            >
              <GlassCard style={[styles.bookCard, isOpen && { borderColor: colors.accentBorder, borderWidth: 1.5 }]}>
                <View style={styles.bookIcon}>
                  <Feather name="calendar" size={18} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bookName}>{item.name}</Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.statusBadge, isOpen ? styles.statusOpen : styles.statusClosed]}>
                      <Text style={[styles.statusText, { color: isOpen ? colors.accent : colors.textSecondary }]}>
                        {isOpen ? "Current" : "Closed"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.bookMeta}>
                    Started {new Date(item.createdAt).toLocaleDateString()}
                    {item.closedAt ? ` · Closed ${new Date(item.closedAt).toLocaleDateString()}` : ""}
                  </Text>
                </View>
                {isOpen && isAdmin ? (
                  <TouchableOpacity onPress={() => handleCloseBook(item.id)} style={styles.lockBtn}>
                    <Feather name="unlock" size={17} color={colors.textSecondary} />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.lockBtn}>
                    <Feather name="lock" size={17} color={colors.textTertiary} />
                  </View>
                )}
              </GlassCard>
            </TouchableOpacity>
          );
        }}
      />
    </Screen>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 16, marginBottom: 12 },
    title: { fontSize: 22, fontWeight: "800", color: c.textPrimary },
    subtitle: { fontSize: 13, color: c.textSecondary, marginTop: 2, maxWidth: 220 },
    newBtn: { paddingHorizontal: 14, paddingVertical: 10 },

    list: { padding: 20, paddingTop: 4, paddingBottom: 40, gap: 12 },

    bookCard: { flexDirection: "row", alignItems: "center", gap: 12 },
    bookIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" },
    bookName: { fontSize: 16, fontWeight: "800", color: c.textPrimary },
    badgeRow: { flexDirection: "row", gap: 6, marginTop: 6 },
    bookMeta: { color: c.textTertiary, fontSize: 12, marginTop: 6 },
    statusBadge: { alignSelf: "flex-start", borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
    statusOpen: { backgroundColor: c.accentSoft },
    statusClosed: { backgroundColor: c.divider },
    statusText: { fontSize: 11, fontWeight: "800" },
    lockBtn: { padding: 6 },
  });
}
