import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import GlassCard from "../../components/GlassCard";
import GlassButton from "../../components/GlassButton";
import GlassInput from "../../components/GlassInput";
import EmptyState from "../../components/EmptyState";
import { useFlat } from "../../context/FlatContext";
import { useAuth } from "../../context/AuthContext";
import { FlatApi, PollApi } from "../../api/endpoints";
import { apiErrorMessage } from "../../api/client";
import { Flat, Poll } from "../../types";
import { Palette } from "../../theme/colors";
import { useTheme } from "../../theme/ThemeContext";

export default function VotingTabScreen() {
  const { flatId, flatName } = useFlat();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [flat, setFlat] = useState<Flat | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [voting, setVoting] = useState<number | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const [pollsRes, flatRes] = await Promise.all([PollApi.list(flatId), FlatApi.detail(flatId)]);
      setPolls(pollsRes.data);
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

  async function handleVote(pollId: number, optionId: number) {
    setVoting(pollId);
    try {
      const { data } = await PollApi.vote(pollId, optionId);
      setPolls((prev) => prev.map((p) => (p.id === pollId ? data : p)));
    } catch (err) {
      Alert.alert("Couldn't vote", apiErrorMessage(err));
    } finally {
      setVoting(null);
    }
  }

  function handleClosePoll(pollId: number) {
    Alert.alert("Close poll?", "Members won't be able to vote after this.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Close Poll",
        style: "destructive",
        onPress: async () => {
          try {
            const { data } = await PollApi.close(pollId);
            setPolls((prev) => prev.map((p) => (p.id === pollId ? data : p)));
          } catch (err) {
            Alert.alert("Couldn't close poll", apiErrorMessage(err));
          }
        },
      },
    ]);
  }

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function addOptionField() {
    setOptions((prev) => [...prev, ""]);
  }

  function removeOptionField(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreatePoll() {
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || cleanOptions.length < 2) {
      Alert.alert("Add a question and at least two options");
      return;
    }
    setCreating(true);
    try {
      await PollApi.create(flatId, question.trim(), cleanOptions);
      setFormOpen(false);
      setQuestion("");
      setOptions(["", ""]);
      load();
    } catch (err) {
      Alert.alert("Couldn't create poll", apiErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <Screen edges={[]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Voting</Text>
          <Text style={styles.subtitle}>{flatName}</Text>
        </View>
        <GlassButton label="New" icon="＋" onPress={() => setFormOpen(true)} style={styles.newBtn} />
      </View>

      <FlatList
        data={polls}
        keyExtractor={(p) => String(p.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loaded ? (
            <EmptyState icon="check-square" title="No polls yet" subtitle="Create one to start voting on flat decisions" />
          ) : (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 30 }} />
          )
        }
        renderItem={({ item }) => {
          const closed = !!item.closedAt;
          const canClose = !closed && (item.createdBy === user?.id || isAdmin);
          return (
            <GlassCard style={styles.pollCard}>
              <View style={styles.pollHeader}>
                <Text style={styles.question}>{item.question}</Text>
                {closed && (
                  <View style={styles.closedBadge}>
                    <Text style={styles.closedBadgeText}>Closed</Text>
                  </View>
                )}
              </View>

              {item.options.map((opt) => {
                const pct = item.totalVotes > 0 ? (opt.votes / item.totalVotes) * 100 : 0;
                const mine = item.myOptionId === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    activeOpacity={closed ? 1 : 0.75}
                    disabled={closed || voting === item.id}
                    onPress={() => handleVote(item.id, opt.id)}
                    style={[styles.optionRow, mine && { borderColor: colors.accentBorder }]}
                  >
                    <View style={[styles.optionFill, { width: `${pct}%`, backgroundColor: colors.accentSoft }]} />
                    <View style={styles.optionContent}>
                      <View style={styles.optionLabelRow}>
                        {mine && <Feather name="check-circle" size={14} color={colors.accent} />}
                        <Text style={[styles.optionLabel, { color: mine ? colors.accent : colors.textPrimary }]}>{opt.label}</Text>
                      </View>
                      <Text style={styles.optionMeta}>
                        {opt.votes} vote{opt.votes === 1 ? "" : "s"} · {pct.toFixed(0)}%
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <View style={styles.pollFooter}>
                <Text style={styles.totalVotes}>{item.totalVotes} total vote{item.totalVotes === 1 ? "" : "s"}</Text>
                {canClose && (
                  <TouchableOpacity onPress={() => handleClosePoll(item.id)}>
                    <Text style={styles.closeLink}>Close poll</Text>
                  </TouchableOpacity>
                )}
              </View>
            </GlassCard>
          );
        }}
      />

      <Modal visible={formOpen} transparent animationType="fade" onRequestClose={() => setFormOpen(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.backdrop} onPress={() => setFormOpen(false)}>
            <Pressable style={styles.sheet}>
              <Text style={styles.sheetTitle}>New Poll</Text>
              <GlassInput placeholder="Question" value={question} onChangeText={setQuestion} style={styles.sheetInput} />
              {options.map((opt, i) => (
                <View key={i} style={styles.optionInputRow}>
                  <GlassInput
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChangeText={(v) => updateOption(i, v)}
                    style={styles.optionInput}
                  />
                  {options.length > 2 && (
                    <TouchableOpacity onPress={() => removeOptionField(i)} style={styles.removeOptionBtn}>
                      <Feather name="x" size={16} color={colors.textTertiary} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity onPress={addOptionField} style={styles.addOptionRow}>
                <Feather name="plus" size={14} color={colors.accent} />
                <Text style={styles.addOptionText}>Add option</Text>
              </TouchableOpacity>
              <GlassButton label="Create Poll" onPress={handleCreatePoll} loading={creating} style={styles.createBtn} />
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 16, marginBottom: 4 },
    title: { fontSize: 22, fontWeight: "800", color: c.textPrimary },
    subtitle: { fontSize: 13, color: c.textSecondary, marginTop: 2 },
    newBtn: { paddingHorizontal: 14, paddingVertical: 10 },

    list: { padding: 20, paddingTop: 12, paddingBottom: 40, gap: 12 },

    pollCard: {},
    pollHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 8 },
    question: { fontSize: 16, fontWeight: "800", color: c.textPrimary, flex: 1 },
    closedBadge: { backgroundColor: c.divider, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
    closedBadgeText: { fontSize: 11, fontWeight: "700", color: c.textSecondary },

    optionRow: {
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderRadius: 12,
      marginBottom: 8,
      overflow: "hidden",
      position: "relative",
    },
    optionFill: { position: "absolute", top: 0, bottom: 0, left: 0 },
    optionContent: { padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    optionLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
    optionLabel: { fontSize: 14, fontWeight: "700" },
    optionMeta: { fontSize: 12, color: c.textSecondary },

    pollFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
    totalVotes: { fontSize: 12, color: c.textTertiary },
    closeLink: { fontSize: 12, color: c.danger, fontWeight: "700" },

    backdrop: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
    sheet: { backgroundColor: c.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 10 },
    sheetTitle: { fontSize: 18, fontWeight: "800", color: c.textPrimary, marginBottom: 4 },
    sheetInput: {},
    optionInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    optionInput: { flex: 1 },
    removeOptionBtn: { padding: 8 },
    addOptionRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
    addOptionText: { color: c.accent, fontWeight: "700", fontSize: 13 },
    createBtn: { marginTop: 10 },
  });
}
