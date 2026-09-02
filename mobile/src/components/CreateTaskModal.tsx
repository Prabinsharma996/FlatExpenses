import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { TaskApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import { Palette } from "../theme/colors";
import { FlatMember, TaskAssignmentType, TaskDifficulty, TaskType } from "../types";
import GlassButton from "./GlassButton";
import GlassCard from "./GlassCard";

type Props = {
  visible: boolean;
  flatId: number;
  members: FlatMember[];
  onClose: () => void;
  onCreated: () => void;
};

const CATEGORIES = [
  { id: "Cooking", label: "🍳 Cooking" },
  { id: "Cleaning", label: "🧹 Cleaning" },
  { id: "Shopping", label: "🛒 Shopping" },
  { id: "Garbage", label: "🗑️ Garbage" },
  { id: "Laundry", label: "🧺 Laundry" },
  { id: "Dishes", label: "🍽️ Dishes" },
  { id: "Bathroom", label: "🚿 Bathroom" },
  { id: "Maintenance", label: "🏠 Maintenance" },
  { id: "Bills", label: "💡 Bills" },
  { id: "Plants", label: "🌱 Plants" },
  { id: "Pet Care", label: "🐕 Pet Care" },
  { id: "Other", label: "📦 Other" },
];

export default function CreateTaskModal({ visible, flatId, members, onClose, onCreated }: Props) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Cooking");
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomCatInput, setShowCustomCatInput] = useState(false);
  const [taskType, setTaskType] = useState<TaskType>("ONE_TIME");
  const [difficulty, setDifficulty] = useState<TaskDifficulty>("MEDIUM");
  const [assignmentType, setAssignmentType] = useState<TaskAssignmentType>("AUTO_FAIR");
  const [assignedUserId, setAssignedUserId] = useState<number | undefined>(user?.id);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (visible) {
      if (user?.id) setAssignedUserId(user.id);
      setTitle("");
      setDescription("");
      setCategory("Cooking");
      setCustomCategory("");
      setShowCustomCatInput(false);
      setTaskType("ONE_TIME");
      setDifficulty("MEDIUM");
      setAssignmentType("AUTO_FAIR");
    }
  }, [visible, user]);

  async function handleCreate() {
    if (!title.trim()) {
      Alert.alert("Required", "Please enter a task title.");
      return;
    }

    const finalCategory = showCustomCatInput ? (customCategory.trim() || "Other") : category;

    setLoading(true);
    try {
      await TaskApi.create(flatId, {
        title: title.trim(),
        description: description.trim() || undefined,
        category: finalCategory,
        taskType,
        difficulty,
        assignmentType,
        assignedUserId: assignmentType === "MANUAL" ? assignedUserId : undefined,
      });

      setTitle("");
      setDescription("");
      setCustomCategory("");
      setShowCustomCatInput(false);
      onCreated();
      onClose();
    } catch (err: any) {
      Alert.alert("Error creating task", err?.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.header}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>+ Add New Task</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Feather name="x" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {/* Task Name */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Task Name *</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.input, borderColor: colors.inputBorder }]}
              placeholder="e.g. Cook Dinner / Clean Kitchen"
              placeholderTextColor={colors.textSecondary}
              value={title}
              onChangeText={setTitle}
            />

            {/* Category Picker */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {CATEGORIES.map((c) => {
                const active = !showCustomCatInput && category === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.chip,
                      { backgroundColor: active ? colors.accent : colors.input },
                    ]}
                    onPress={() => {
                      setCategory(c.id);
                      setShowCustomCatInput(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, { color: active ? colors.onAccent : colors.textPrimary }]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[
                  styles.chip,
                  { backgroundColor: showCustomCatInput ? colors.accent : colors.input },
                ]}
                onPress={() => setShowCustomCatInput(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, { color: showCustomCatInput ? colors.onAccent : colors.textPrimary }]}>
                  ✨ + Custom Category
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {showCustomCatInput && (
              <TextInput
                style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.input, borderColor: colors.accent, marginTop: 4 }]}
                placeholder="Type custom task category e.g. Car Wash / Plants"
                placeholderTextColor={colors.textSecondary}
                value={customCategory}
                onChangeText={setCustomCategory}
              />
            )}

            {/* Description */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.input, borderColor: colors.inputBorder }]}
              placeholder="Add details e.g. Prepare dinner for everyone"
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
            />

            {/* Task Type */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Task Type</Text>
            <View style={styles.segmentRow}>
              {(["ONE_TIME", "RECURRING", "ROTATING"] as TaskType[]).map((type) => {
                const active = taskType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.segmentBtn,
                      { backgroundColor: active ? colors.accent : colors.input },
                    ]}
                    onPress={() => setTaskType(type)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.segmentText, { color: active ? colors.onAccent : colors.textPrimary }]}>
                      {type === "ONE_TIME" ? "One-time" : type === "RECURRING" ? "Recurring" : "Rotating"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Difficulty Points */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Difficulty & Workload Points</Text>
            <View style={styles.segmentRow}>
              {[
                { key: "EASY", label: "Easy (1 pt)" },
                { key: "MEDIUM", label: "Medium (3 pts)" },
                { key: "HARD", label: "Hard (5 pts)" },
              ].map((d) => {
                const active = difficulty === d.key;
                return (
                  <TouchableOpacity
                    key={d.key}
                    style={[
                      styles.segmentBtn,
                      { backgroundColor: active ? colors.accent : colors.input },
                    ]}
                    onPress={() => setDifficulty(d.key as TaskDifficulty)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.segmentText, { color: active ? colors.onAccent : colors.textPrimary }]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Assignment Mode */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Assignment</Text>
            <View style={styles.radioGroup}>
              {[
                { type: "AUTO_FAIR", label: "⚡ Auto assign fairly (Balanced workload)" },
                { type: "MANUAL", label: "👤 Assign to specific member" },
              ].map((mode) => {
                const active = assignmentType === mode.type;
                return (
                  <TouchableOpacity
                    key={mode.type}
                    style={[
                      styles.radioRow,
                      { backgroundColor: active ? colors.accentSoft : colors.input },
                    ]}
                    onPress={() => setAssignmentType(mode.type as TaskAssignmentType)}
                    activeOpacity={0.8}
                  >
                    <Feather
                      name={active ? "check-circle" : "circle"}
                      size={18}
                      color={active ? colors.accent : colors.textSecondary}
                    />
                    <Text style={[styles.radioText, { color: active ? colors.accent : colors.textPrimary }]}>
                      {mode.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Specific Member Selector if MANUAL */}
            {assignmentType === "MANUAL" && (
              <View style={{ marginTop: 8 }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Select Member</Text>
                <View style={styles.segmentRow}>
                  {members.map((m) => {
                    const active = assignedUserId === m.userId;
                    return (
                      <TouchableOpacity
                        key={m.userId}
                        style={[
                          styles.segmentBtn,
                          { backgroundColor: active ? colors.accent : colors.input },
                        ]}
                        onPress={() => setAssignedUserId(m.userId)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.segmentText, { color: active ? colors.onAccent : colors.textPrimary }]}>
                          {m.user.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <GlassButton
              label={loading ? "Creating..." : "Create Task 🚀"}
              onPress={handleCreate}
              disabled={loading}
              style={{ marginTop: 20 }}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "flex-end",
    },
    modalCard: {
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      maxHeight: "90%",
      padding: 20,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "800",
    },
    body: {
      paddingBottom: 24,
    },
    label: {
      fontSize: 12,
      fontWeight: "700",
      marginTop: 12,
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
    },
    chipRow: {
      flexDirection: "row",
      marginBottom: 6,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 14,
      marginRight: 8,
    },
    chipText: {
      fontSize: 13,
      fontWeight: "700",
    },
    segmentRow: {
      flexDirection: "row",
      gap: 8,
      flexWrap: "wrap",
    },
    segmentBtn: {
      flex: 1,
      minWidth: 90,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 12,
      alignItems: "center",
    },
    segmentText: {
      fontSize: 12,
      fontWeight: "700",
    },
    radioGroup: {
      gap: 8,
    },
    radioRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 12,
      borderRadius: 14,
    },
    radioText: {
      fontSize: 13,
      fontWeight: "700",
    },
  });
}
