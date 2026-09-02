import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { FlatApi, TaskApi } from "../../api/endpoints";
import GlassButton from "../../components/GlassButton";
import GlassCard from "../../components/GlassCard";
import Screen from "../../components/Screen";
import { useAuth } from "../../context/AuthContext";
import { useFlat } from "../../context/FlatContext";
import { useTheme } from "../../theme/ThemeContext";
import { Palette } from "../../theme/colors";
import { Flat, Task, TaskWorkload } from "../../types";
import CreateTaskModal from "../../components/CreateTaskModal";
import TaskPreferencesModal from "../../components/TaskPreferencesModal";
import TaskSpinWheelModal from "../../components/TaskSpinWheelModal";

type FilterTab = "ALL" | "TODAY" | "MY_TASKS" | "UPCOMING" | "COMPLETED";

export default function TasksTabScreen() {
  const { user } = useAuth();
  const { flatId } = useFlat();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [flat, setFlat] = useState<Flat | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workload, setWorkload] = useState<TaskWorkload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("TODAY");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPrefModal, setShowPrefModal] = useState(false);
  const [showSpinWheelModal, setShowSpinWheelModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [tasksRes, workloadRes, flatRes] = await Promise.all([
        TaskApi.list(flatId),
        TaskApi.workload(flatId),
        FlatApi.detail(flatId),
      ]);
      setTasks(tasksRes.data);
      setWorkload(workloadRes.data);
      setFlat(flatRes.data);
    } catch (err: any) {
      console.warn("Failed to load tasks", err);
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

  async function handleCompleteTask(taskId: number) {
    try {
      await TaskApi.complete(taskId);
      loadData();
    } catch (err: any) {
      Alert.alert("Error completing task", err?.response?.data?.error || err.message);
    }
  }

  async function handleSkipTask(taskId: number) {
    Alert.alert(
      "Skip / Reassign Task",
      "Would you like to skip this task for today or auto-reassign to another member?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Skip Only", onPress: () => TaskApi.skip(taskId, "Skipped by user", false).then(loadData) },
        { text: "Auto Reassign", onPress: () => TaskApi.skip(taskId, "Reassigned", true).then(loadData) },
      ]
    );
  }

  async function handleSwapTask(taskId: number) {
    const members = flat?.members ?? [];
    if (members.length <= 1) {
      Alert.alert("Notice", "Need at least 2 members to request a task swap.");
      return;
    }

    const otherMembers = members.filter((m) => m.userId !== user?.id);
    Alert.alert(
      "Request Task Swap",
      "Select a flatmate to swap this task with:",
      [
        ...otherMembers.map((m) => ({
          text: m.user.name,
          onPress: () =>
            TaskApi.swap(taskId, m.userId, "Can't complete today")
              .then(() => {
                Alert.alert("Request Sent", `Swap request sent to ${m.user.name}`);
                loadData();
              })
              .catch((err) => Alert.alert("Error", err?.response?.data?.error || err.message)),
        })),
        { text: "Cancel", style: "cancel" },
      ]
    );
  }

  function getLocalDateStr(dInput?: string | Date) {
    const d = dInput ? new Date(dInput) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Filter tasks logic
  const filteredTasks = useMemo(() => {
    const todayStr = getLocalDateStr();
    return tasks.filter((t) => {
      if (filter === "COMPLETED") return t.status === "COMPLETED";
      if (t.status === "COMPLETED") return false;

      const taskDateStr = getLocalDateStr(t.dueDate);

      if (filter === "TODAY") {
        return taskDateStr === todayStr;
      }
      if (filter === "MY_TASKS") return t.assignedUserId === user?.id;
      if (filter === "UPCOMING") {
        return taskDateStr >= todayStr;
      }
      return true;
    });
  }, [tasks, filter, user]);

  const myPoints = useMemo(() => {
    if (!workload || !user) return 0;
    const item = workload.members.find((m) => m.userId === user.id);
    return item ? item.points : 0;
  }, [workload, user]);

  if (loading && !refreshing) {
    return (
      <Screen edges={[]}>
        <ActivityIndicator size="large" color={colors.accent} style={{ flex: 1 }} />
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Tasks & Workload</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Divide living work fairly
          </Text>
        </View>

        {/* Action Row Bar */}
        <View style={styles.actionRowBar}>
          <TouchableOpacity
            style={[styles.actionRowBtn, { backgroundColor: colors.accentSoft }]}
            onPress={() => setShowSpinWheelModal(true)}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 13 }}>🎡</Text>
            <Text style={[styles.actionRowBtnText, { color: colors.accent }]}>Spin Wheel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRowBtn, { backgroundColor: colors.input, borderColor: colors.inputBorder, borderWidth: 1 }]}
            onPress={() => setShowPrefModal(true)}
            activeOpacity={0.75}
          >
            <Feather name="settings" size={13} color={colors.textPrimary} />
            <Text style={[styles.actionRowBtnText, { color: colors.textPrimary }]}>Preferences</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRowBtn, { backgroundColor: colors.accent }]}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={14} color={colors.onAccent} />
            <Text style={[styles.actionRowBtnText, { color: colors.onAccent }]}>Add Task</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Workload Fairness Dashboard Card */}
      {workload && (
        <GlassCard style={styles.workloadCard}>
          <View style={styles.workloadHeader}>
            <View style={styles.fairnessBadgeRow}>
              <View style={[styles.fairnessDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.fairnessTitle, { color: colors.textPrimary }]}>
                Workload Fairness Score
              </Text>
            </View>
            <Text style={[styles.fairnessScore, { color: colors.accent }]}>
              {workload.fairnessScore}% ✓
            </Text>
          </View>

          {/* Points Progress Bar */}
          <View style={styles.pointsSummary}>
            <Text style={[styles.myPointsText, { color: colors.textPrimary }]}>
              You: <Text style={{ color: colors.accent, fontWeight: "800" }}>{myPoints} pts</Text>
            </Text>
            <Text style={[styles.avgPointsText, { color: colors.textSecondary }]}>
              Flat Avg: {workload.average} pts
            </Text>
          </View>

          <View style={styles.memberBars}>
            {workload.members.map((m) => {
              const maxPts = Math.max(1, ...workload.members.map((x) => x.points));
              const pct = Math.min(100, Math.round((m.points / maxPts) * 100));
              const isMe = m.userId === user?.id;
              return (
                <View key={m.userId} style={styles.memberBarRow}>
                  <Text style={[styles.memberName, { color: isMe ? colors.accent : colors.textPrimary }]}>
                    {isMe ? "You" : m.name}
                  </Text>
                  <View style={[styles.trackBar, { backgroundColor: colors.input }]}>
                    <View
                      style={[
                        styles.fillBar,
                        {
                          width: `${pct}%`,
                          backgroundColor: isMe ? colors.accent : colors.textSecondary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.memberPts, { color: colors.textSecondary }]}>{m.points} pts</Text>
                </View>
              );
            })}
          </View>
        </GlassCard>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {[
          { key: "TODAY", label: "Today" },
          { key: "MY_TASKS", label: "My Tasks" },
          { key: "ALL", label: "All" },
          { key: "UPCOMING", label: "Upcoming" },
          { key: "COMPLETED", label: "Done" },
        ].map((tab) => {
          const active = filter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.filterChip,
                { backgroundColor: active ? colors.accent : colors.card },
              ]}
              onPress={() => setFilter(tab.key as FilterTab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterText, { color: active ? colors.onAccent : colors.textSecondary }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tasks List */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="check-circle" size={44} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No tasks found for this view!
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isAssignedToMe = item.assignedUserId === user?.id;
          const isDone = item.status === "COMPLETED";

          return (
            <GlassCard style={styles.taskCard}>
              <View style={styles.taskCardHeader}>
                <View style={styles.taskTitleRow}>
                  <Text style={[styles.taskTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                  <View style={[styles.pointsBadge, { backgroundColor: colors.accentSoft }]}>
                    <Text style={[styles.pointsBadgeText, { color: colors.accent }]}>
                      +{item.points} pts
                    </Text>
                  </View>
                </View>

                {item.description ? (
                  <Text style={[styles.taskDesc, { color: colors.textSecondary }]}>{item.description}</Text>
                ) : null}
              </View>

              <View style={styles.taskMetaRow}>
                <View style={styles.metaItem}>
                  <Feather name="user" size={13} color={colors.accent} />
                  <Text style={[styles.metaText, { color: colors.textPrimary }]}>
                    {item.assignedUser ? item.assignedUser.name : "Unassigned"}
                  </Text>
                </View>

                <View style={styles.metaItem}>
                  <Feather name="clock" size={13} color={colors.textSecondary} />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    {item.dueTime || "7:00 PM"}
                  </Text>
                </View>

                <View style={[styles.categoryTag, { backgroundColor: colors.input }]}>
                  <Text style={[styles.categoryText, { color: colors.textSecondary }]}>
                    {item.category}
                  </Text>
                </View>
              </View>

              {/* Actions Footer */}
              {!isDone && (
                <View style={[styles.cardFooter, { borderTopColor: colors.divider }]}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.accent }]}
                    onPress={() => handleCompleteTask(item.id)}
                    activeOpacity={0.8}
                  >
                    <Feather name="check" size={15} color={colors.onAccent} />
                    <Text style={[styles.actionBtnText, { color: colors.onAccent }]}>Mark Complete</Text>
                  </TouchableOpacity>

                  {isAssignedToMe && (
                    <TouchableOpacity
                      style={[styles.actionBtnSecondary, { backgroundColor: colors.input }]}
                      onPress={() => handleSwapTask(item.id)}
                      activeOpacity={0.8}
                    >
                      <Feather name="repeat" size={13} color={colors.textPrimary} />
                      <Text style={[styles.actionBtnSecondaryText, { color: colors.textPrimary }]}>Swap</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.actionBtnSecondary, { backgroundColor: colors.input }]}
                    onPress={() => handleSkipTask(item.id)}
                    activeOpacity={0.8}
                  >
                    <Feather name="skip-forward" size={13} color={colors.textSecondary} />
                    <Text style={[styles.actionBtnSecondaryText, { color: colors.textSecondary }]}>Skip</Text>
                  </TouchableOpacity>
                </View>
              )}
            </GlassCard>
          );
        }}
      />

      {/* Floating Action Button for Adding Task */}
      <TouchableOpacity
        style={[styles.fabBtn, { backgroundColor: colors.accent }]}
        onPress={() => setShowCreateModal(true)}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={24} color={colors.onAccent} />
      </TouchableOpacity>

      {/* Create Task Modal */}
      <CreateTaskModal
        visible={showCreateModal}
        flatId={flatId}
        members={flat?.members ?? []}
        onClose={() => setShowCreateModal(false)}
        onCreated={loadData}
      />

      {/* Task Preferences Modal */}
      <TaskPreferencesModal
        visible={showPrefModal}
        flatId={flatId}
        onClose={() => setShowPrefModal(false)}
      />

      {/* Spin Wheel Modal */}
      <TaskSpinWheelModal
        visible={showSpinWheelModal}
        flatId={flatId}
        members={flat?.members ?? []}
        onClose={() => setShowSpinWheelModal(false)}
        onCreated={loadData}
      />
    </Screen>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
      gap: 12,
    },
    titleSection: {},
    title: {
      fontSize: 22,
      fontWeight: "800",
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 13,
      marginTop: 2,
    },
    actionRowBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    actionRowBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      paddingVertical: 9,
      paddingHorizontal: 6,
      borderRadius: 12,
    },
    actionRowBtnText: {
      fontSize: 12,
      fontWeight: "800",
    },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 12,
    },
    addBtnText: {
      fontSize: 13,
      fontWeight: "800",
    },

    workloadCard: {
      marginHorizontal: 20,
      marginTop: 10,
      marginBottom: 14,
      padding: 16,
    },
    workloadHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    fairnessBadgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    fairnessDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    fairnessTitle: {
      fontSize: 13,
      fontWeight: "800",
    },
    fairnessScore: {
      fontSize: 15,
      fontWeight: "800",
    },

    pointsSummary: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    myPointsText: {
      fontSize: 13,
    },
    avgPointsText: {
      fontSize: 12,
    },

    memberBars: {
      gap: 6,
    },
    memberBarRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    memberName: {
      fontSize: 12,
      fontWeight: "700",
      width: 60,
    },
    trackBar: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      overflow: "hidden",
    },
    fillBar: {
      height: "100%",
      borderRadius: 4,
    },
    memberPts: {
      fontSize: 11,
      fontWeight: "700",
      width: 45,
      textAlign: "right",
    },

    filterRow: {
      flexDirection: "row",
      paddingHorizontal: 20,
      gap: 6,
      marginBottom: 10,
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    filterText: {
      fontSize: 12,
      fontWeight: "700",
    },

    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
      gap: 12,
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

    taskCard: {
      padding: 16,
    },
    taskCardHeader: {
      marginBottom: 10,
    },
    taskTitleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    taskTitle: {
      fontSize: 16,
      fontWeight: "800",
      flex: 1,
    },
    pointsBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    pointsBadgeText: {
      fontSize: 11,
      fontWeight: "800",
    },
    taskDesc: {
      fontSize: 13,
      marginTop: 4,
    },

    taskMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
    },
    metaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    metaText: {
      fontSize: 12,
      fontWeight: "600",
    },
    categoryTag: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    categoryText: {
      fontSize: 11,
      fontWeight: "700",
    },

    cardFooter: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
    },
    actionBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      flex: 1,
      justifyContent: "center",
    },
    actionBtnText: {
      fontSize: 12,
      fontWeight: "800",
    },
    actionBtnSecondary: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
    },
    actionBtnSecondaryText: {
      fontSize: 12,
      fontWeight: "700",
    },
    fabBtn: {
      position: "absolute",
      bottom: 24,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      elevation: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      zIndex: 99,
    },
  });
}
