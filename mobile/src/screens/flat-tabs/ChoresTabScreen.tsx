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
import { ChoreApi, FlatApi } from "../../api/endpoints";
import { apiErrorMessage } from "../../api/client";
import { Chore, ChoreFrequency, Flat } from "../../types";
import { Palette } from "../../theme/colors";
import { useTheme } from "../../theme/ThemeContext";

const FREQUENCIES: { value: ChoreFrequency; label: string }[] = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Bi-weekly" },
  { value: "MONTHLY", label: "Monthly" },
];

export default function ChoresTabScreen() {
  const { flatId, flatName } = useFlat();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [flat, setFlat] = useState<Flat | null>(null);
  const [chores, setChores] = useState<Chore[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingAction, setLoadingAction] = useState<number | null>(null);

  // New Chore Modal state
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<ChoreFrequency>("WEEKLY");
  const [assignedUserId, setAssignedUserId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  // Filter state
  const [activeTab, setActiveTab] = useState<"all" | "mine" | "pending" | "completed">("all");

  const load = useCallback(async () => {
    try {
      const [choresRes, flatRes] = await Promise.all([ChoreApi.list(flatId), FlatApi.detail(flatId)]);
      setChores(choresRes.data);
      setFlat(flatRes.data);
      if (!assignedUserId && flatRes.data.members.length > 0) {
        setAssignedUserId(user?.id ?? flatRes.data.members[0].userId);
      }
    } catch (err) {
      console.warn(apiErrorMessage(err));
    } finally {
      setLoaded(true);
    }
  }, [flatId, user?.id]);

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

  async function handleToggle(choreId: number) {
    setLoadingAction(choreId);
    try {
      const { data } = await ChoreApi.toggle(choreId);
      setChores((prev) => prev.map((c) => (c.id === choreId ? data : c)));
    } catch (err) {
      Alert.alert("Couldn't update chore", apiErrorMessage(err));
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleRotate(choreId: number) {
    setLoadingAction(choreId);
    try {
      const { data } = await ChoreApi.rotate(choreId);
      setChores((prev) => prev.map((c) => (c.id === choreId ? data : c)));
    } catch (err) {
      Alert.alert("Couldn't rotate duty", apiErrorMessage(err));
    } finally {
      setLoadingAction(null);
    }
  }

  function handleDelete(choreId: number) {
    Alert.alert("Delete duty?", "Are you sure you want to remove this chore?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await ChoreApi.remove(choreId);
            setChores((prev) => prev.filter((c) => c.id !== choreId));
          } catch (err) {
            Alert.alert("Couldn't delete chore", apiErrorMessage(err));
          }
        },
      },
    ]);
  }

  async function handleCreateChore() {
    if (!title.trim()) {
      Alert.alert("Please enter a title for the chore");
      return;
    }
    setCreating(true);
    try {
      const { data } = await ChoreApi.create(flatId, {
        title: title.trim(),
        description: description.trim() || undefined,
        frequency,
        assignedUserId: assignedUserId || undefined,
      });
      setChores((prev) => [data, ...prev]);
      setFormOpen(false);
      setTitle("");
      setDescription("");
      setFrequency("WEEKLY");
    } catch (err) {
      Alert.alert("Couldn't create chore", apiErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  const filteredChores = useMemo(() => {
    return chores.filter((c) => {
      if (activeTab === "mine") return c.assignedUserId === user?.id;
      if (activeTab === "pending") return !c.isCompleted;
      if (activeTab === "completed") return c.isCompleted;
      return true;
    });
  }, [chores, activeTab, user?.id]);

  const pendingCount = chores.filter((c) => !c.isCompleted).length;
  const myPendingCount = chores.filter((c) => !c.isCompleted && c.assignedUserId === user?.id).length;

  return (
    <Screen edges={[]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Duty Roster</Text>
          <Text style={styles.subtitle}>
            {pendingCount} pending · {myPendingCount > 0 ? `${myPendingCount} assigned to you` : "All clear!"}
          </Text>
        </View>
        <GlassButton label="New Duty" icon="＋" onPress={() => setFormOpen(true)} style={styles.newBtn} />
      </View>

      {/* ── Filter Tabs ── */}
      <View style={styles.tabRow}>
        {(["all", "mine", "pending", "completed"] as const).map((tab) => {
          const isActive = activeTab === tab;
          const labels = { all: "All", mine: "My Turn", pending: "Pending", completed: "Done" };
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabChip, isActive && { backgroundColor: colors.accent }]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabChipText, { color: isActive ? colors.onAccent : colors.textSecondary }]}>
                {labels[tab]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Chores List ── */}
      <FlatList
        data={filteredChores}
        keyExtractor={(c) => String(c.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loaded ? (
            <EmptyState
              icon="check-circle"
              title="No duties found"
              subtitle={activeTab !== "all" ? "Try switching filters" : "Tap 'New Duty' to assign flat chores"}
            />
          ) : (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 30 }} />
          )
        }
        renderItem={({ item }) => {
          const isMine = item.assignedUserId === user?.id;
          const isLoadingThis = loadingAction === item.id;

          return (
            <GlassCard style={[styles.choreCard, item.isCompleted && styles.choreCardCompleted]}>
              <View style={styles.choreMain}>
                {/* Checkbox */}
                <TouchableOpacity
                  onPress={() => handleToggle(item.id)}
                  disabled={isLoadingThis}
                  style={styles.checkboxTouch}
                  activeOpacity={0.7}
                >
                  <Feather
                    name={item.isCompleted ? "check-square" : "square"}
                    size={22}
                    color={item.isCompleted ? colors.textTertiary : colors.accent}
                  />
                </TouchableOpacity>

                {/* Content */}
                <View style={styles.choreInfo}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.choreTitle, item.isCompleted && styles.completedText]}>
                      {item.title}
                    </Text>
                    <View style={[styles.freqBadge, { backgroundColor: colors.input }]}>
                      <Text style={[styles.freqText, { color: colors.textSecondary }]}>{item.frequency}</Text>
                    </View>
                  </View>

                  {!!item.description && (
                    <Text style={[styles.choreDesc, item.isCompleted && styles.completedText]}>
                      {item.description}
                    </Text>
                  )}

                  {/* Assignee pill */}
                  <View style={styles.metaRow}>
                    <View style={[styles.assigneeBadge, isMine && { backgroundColor: colors.accentSoft }]}>
                      <Feather name="user" size={12} color={isMine ? colors.accent : colors.textSecondary} />
                      <Text style={[styles.assigneeText, { color: isMine ? colors.accent : colors.textPrimary }]}>
                        {isMine ? "Your Turn" : item.assignedUser?.name ?? "Unassigned"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.cardFooter}>
                <TouchableOpacity
                  style={[styles.rotateBtn, { borderColor: colors.cardBorder }]}
                  onPress={() => handleRotate(item.id)}
                  disabled={isLoadingThis}
                  activeOpacity={0.75}
                >
                  <Feather name="rotate-cw" size={12} color={colors.accent} />
                  <Text style={[styles.rotateBtnText, { color: colors.accent }]}>Pass Duty 🔄</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(item.id)}
                  disabled={isLoadingThis}
                  activeOpacity={0.75}
                >
                  <Feather name="trash-2" size={14} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </GlassCard>
          );
        }}
      />

      {/* ── New Chore Modal ── */}
      <Modal visible={formOpen} transparent animationType="fade" onRequestClose={() => setFormOpen(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.backdrop} onPress={() => setFormOpen(false)}>
            <Pressable style={styles.sheet}>
              <Text style={styles.sheetTitle}>New Duty / Chore</Text>

              <GlassInput
                placeholder="Title (e.g. Kitchen Cleaning)"
                value={title}
                onChangeText={setTitle}
              />

              <GlassInput
                placeholder="Description (optional)"
                value={description}
                onChangeText={setDescription}
              />

              {/* Frequency selection */}
              <Text style={styles.fieldLabel}>Frequency</Text>
              <View style={styles.freqRow}>
                {FREQUENCIES.map((f) => (
                  <TouchableOpacity
                    key={f.value}
                    style={[styles.freqChip, frequency === f.value && { backgroundColor: colors.accent }]}
                    onPress={() => setFrequency(f.value)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.freqChipText, { color: frequency === f.value ? colors.onAccent : colors.textPrimary }]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Member assignment selection */}
              <Text style={styles.fieldLabel}>Assign First Turn</Text>
              <View style={styles.memberRow}>
                {(flat?.members ?? []).map((m) => {
                  const isSelected = assignedUserId === m.userId;
                  return (
                    <TouchableOpacity
                      key={m.userId}
                      style={[styles.memberChip, isSelected && { backgroundColor: colors.accent }]}
                      onPress={() => setAssignedUserId(m.userId)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.memberChipText, { color: isSelected ? colors.onAccent : colors.textPrimary }]}>
                        {m.user.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <GlassButton
                label="Create Duty"
                onPress={handleCreateChore}
                loading={creating}
                style={{ marginTop: 12 }}
              />
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 16 },
    title: { fontSize: 22, fontWeight: "800", color: c.textPrimary },
    subtitle: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    newBtn: { paddingHorizontal: 14, paddingVertical: 9 },

    tabRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, marginTop: 14 },
    tabChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: c.card },
    tabChipText: { fontSize: 12, fontWeight: "700" },

    list: { padding: 20, paddingTop: 14, paddingBottom: 40, gap: 12 },

    choreCard: { padding: 14 },
    choreCardCompleted: { opacity: 0.65 },
    choreMain: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
    checkboxTouch: { paddingTop: 2 },
    choreInfo: { flex: 1 },
    titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
    choreTitle: { fontSize: 15, fontWeight: "800", color: c.textPrimary, flex: 1 },
    completedText: { textDecorationLine: "line-through", color: c.textTertiary },
    choreDesc: { fontSize: 13, color: c.textSecondary, marginTop: 4 },
    freqBadge: { borderRadius: 6, paddingVertical: 2, paddingHorizontal: 6 },
    freqText: { fontSize: 10, fontWeight: "700" },

    metaRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
    assigneeBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: c.input, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
    assigneeText: { fontSize: 12, fontWeight: "700" },

    cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.divider },
    rotateBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 },
    rotateBtnText: { fontSize: 12, fontWeight: "700" },
    deleteBtn: { padding: 4 },

    backdrop: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
    sheet: { backgroundColor: c.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 10 },
    sheetTitle: { fontSize: 18, fontWeight: "800", color: c.textPrimary, marginBottom: 6 },
    fieldLabel: { fontSize: 12, fontWeight: "700", color: c.textSecondary, marginTop: 4 },
    freqRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    freqChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: c.input },
    freqChipText: { fontSize: 12, fontWeight: "600" },
    memberRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    memberChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: c.input },
    memberChipText: { fontSize: 12, fontWeight: "600" },
  });
}
