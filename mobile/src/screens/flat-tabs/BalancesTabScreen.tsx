import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Screen from "../../components/Screen";
import GlassCard from "../../components/GlassCard";
import EmptyState from "../../components/EmptyState";
import { useFlat } from "../../context/FlatContext";
import { FlatApi } from "../../api/endpoints";
import { apiErrorMessage } from "../../api/client";
import { FlatBalances } from "../../types";
import { Palette } from "../../theme/colors";
import { useTheme } from "../../theme/ThemeContext";

export default function BalancesTabScreen() {
  const { flatId } = useFlat();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [balances, setBalances] = useState<FlatBalances | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await FlatApi.balances(flatId);
      setBalances(data);
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

  if (!balances) {
    return (
      <Screen edges={[]}>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  const allSettled = balances.transactions.length === 0;

  return (
    <Screen edges={[]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <Text style={styles.title}>Balances & Settlements</Text>

        {allSettled ? (
          <EmptyState
            icon="check-circle"
            title="All Settled Up! 🎉"
            subtitle="No outstanding balances right now"
            tint="accent"
          />
        ) : (
          <>
            <GlassCard style={styles.card}>
              <Text style={styles.sectionTitle}>Net position</Text>
              {balances.netByUser.map((nb) => (
                <View key={nb.userId} style={styles.balanceRow}>
                  <Text style={styles.balanceName}>{nb.name}</Text>
                  <Text style={[styles.balanceAmount, { color: nb.net >= 0 ? colors.accent : colors.danger }]}>
                    {nb.net >= 0 ? `gets back ₹${nb.net.toFixed(2)}` : `owes ₹${Math.abs(nb.net).toFixed(2)}`}
                  </Text>
                </View>
              ))}
            </GlassCard>

            <GlassCard style={styles.card}>
              <Text style={styles.sectionTitle}>Who pays whom</Text>
              {balances.transactions.map((t, idx) => (
                <View key={idx} style={styles.transactionRow}>
                  <Text style={styles.transactionText}>
                    {t.fromUser?.name} → {t.toUser?.name}
                  </Text>
                  <Text style={styles.transactionAmount}>₹{Number(t.amount).toFixed(2)}</Text>
                </View>
              ))}
            </GlassCard>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    content: { padding: 20, paddingBottom: 40, gap: 16 },
    title: { fontSize: 22, fontWeight: "800", color: c.textPrimary, marginBottom: 4 },
    card: {},
    sectionTitle: { fontSize: 16, fontWeight: "800", color: c.textPrimary, marginBottom: 10 },
    balanceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
    balanceName: { fontSize: 15, color: c.textPrimary, fontWeight: "600" },
    balanceAmount: { fontSize: 15, fontWeight: "700" },
    transactionRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    transactionText: { fontSize: 14, color: c.textPrimary, fontWeight: "600" },
    transactionAmount: { fontSize: 14, color: c.accent, fontWeight: "800" },
  });
}
