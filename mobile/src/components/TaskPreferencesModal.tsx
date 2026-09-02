import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { TaskApi } from "../api/endpoints";
import { useTheme } from "../theme/ThemeContext";
import { Palette } from "../theme/colors";
import GlassButton from "./GlassButton";

type Props = {
  visible: boolean;
  flatId: number;
  onClose: () => void;
};

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const ALL_CATEGORIES = [
  "Cooking",
  "Cleaning",
  "Shopping",
  "Garbage",
  "Laundry",
  "Dishes",
  "Bathroom",
  "Maintenance",
  "Bills",
  "Plants",
  "Pet Care",
  "Other",
];

export default function TaskPreferencesModal({ visible, flatId, onClose }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [availableDays, setAvailableDays] = useState<string[]>(ALL_DAYS);
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);
  const [avoidCategories, setAvoidCategories] = useState<string[]>([]);
  const [preferredTime, setPreferredTime] = useState<string>("ANY");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && flatId) {
      TaskApi.getPreferences(flatId)
        .then(({ data }) => {
          if (data.availableDays) {
            setAvailableDays(data.availableDays.split(",").filter(Boolean));
          }
          if (data.preferredCategories) {
            setPreferredCategories(data.preferredCategories.split(",").filter(Boolean));
          }
          if (data.avoidCategories) {
            setAvoidCategories(data.avoidCategories.split(",").filter(Boolean));
          }
          if (data.preferredTime) {
            setPreferredTime(data.preferredTime);
          }
        })
        .catch(() => {});
    }
  }, [visible, flatId]);

  function toggleDay(day: string) {
    setAvailableDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function togglePreferred(cat: string) {
    setPreferredCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
    // Remove from avoid if preferred
    setAvoidCategories((prev) => prev.filter((c) => c !== cat));
  }

  function toggleAvoid(cat: string) {
    setAvoidCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
    // Remove from preferred if avoided
    setPreferredCategories((prev) => prev.filter((c) => c !== cat));
  }

  async function handleSave() {
    setLoading(true);
    try {
      await TaskApi.updatePreferences(flatId, {
        availableDays: availableDays.join(","),
        preferredCategories: preferredCategories.join(","),
        avoidCategories: avoidCategories.join(","),
        preferredTime,
      });
      Alert.alert("Success", "Task preferences updated!");
      onClose();
    } catch (err: any) {
      Alert.alert("Error saving preferences", err?.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.header}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>⚙️ My Task Preferences</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Feather name="x" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 14 }}>
              Set your available days, preferred tasks, and tasks to avoid so auto-assignment works around your schedule!
            </Text>
            {/* Available Days */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Available Days</Text>
            <View style={styles.daysRow}>
              {ALL_DAYS.map((day) => {
                const active = availableDays.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayChip,
                      { backgroundColor: active ? colors.accent : colors.input },
                    ]}
                    onPress={() => toggleDay(day)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dayText, { color: active ? colors.onAccent : colors.textPrimary }]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Preferred Categories */}
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>
              Preferred Tasks (Higher Priority)
            </Text>
            <View style={styles.catWrap}>
              {ALL_CATEGORIES.map((cat) => {
                const active = preferredCategories.includes(cat);
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.catChip,
                      { backgroundColor: active ? colors.accentSoft : colors.input },
                    ]}
                    onPress={() => togglePreferred(cat)}
                    activeOpacity={0.8}
                  >
                    <Feather
                      name={active ? "check" : "plus"}
                      size={12}
                      color={active ? colors.accent : colors.textSecondary}
                    />
                    <Text style={[styles.catText, { color: active ? colors.accent : colors.textPrimary }]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Avoid Categories */}
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>
              Tasks to Avoid (Lower Priority)
            </Text>
            <View style={styles.catWrap}>
              {ALL_CATEGORIES.map((cat) => {
                const active = avoidCategories.includes(cat);
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.catChip,
                      { backgroundColor: active ? "#FEE2E2" : colors.input },
                    ]}
                    onPress={() => toggleAvoid(cat)}
                    activeOpacity={0.8}
                  >
                    <Feather
                      name={active ? "slash" : "minus"}
                      size={12}
                      color={active ? colors.danger : colors.textSecondary}
                    />
                    <Text style={[styles.catText, { color: active ? colors.danger : colors.textPrimary }]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Preferred Time */}
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>Preferred Time</Text>
            <View style={styles.segmentRow}>
              {[
                { key: "ANY", label: "Anytime" },
                { key: "MORNING", label: "Morning" },
                { key: "EVENING", label: "Evening" },
              ].map((t) => {
                const active = preferredTime === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[
                      styles.segmentBtn,
                      { backgroundColor: active ? colors.accent : colors.input },
                    ]}
                    onPress={() => setPreferredTime(t.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.segmentText, { color: active ? colors.onAccent : colors.textPrimary }]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <GlassButton
              label={loading ? "Saving..." : "Save Preferences"}
              onPress={handleSave}
              disabled={loading}
              style={{ marginTop: 24 }}
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
      maxHeight: "85%",
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
      marginBottom: 8,
    },
    daysRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 4,
    },
    dayChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      alignItems: "center",
    },
    dayText: {
      fontSize: 11,
      fontWeight: "800",
    },
    catWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    catChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 12,
    },
    catText: {
      fontSize: 12,
      fontWeight: "700",
    },
    segmentRow: {
      flexDirection: "row",
      gap: 8,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      alignItems: "center",
    },
    segmentText: {
      fontSize: 12,
      fontWeight: "700",
    },
  });
}
