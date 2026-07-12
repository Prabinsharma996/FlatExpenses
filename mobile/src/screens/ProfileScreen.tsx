import React, { useState, useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Text,
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../navigation/types";
import { useAuth } from "../context/AuthContext";
import { FlatApi } from "../api/endpoints";
import { apiErrorMessage } from "../api/client";
import { useTheme } from "../theme/ThemeContext";
import { Palette } from "../theme/colors";
import Screen from "../components/Screen";
import GlassCard from "../components/GlassCard";
import GlassInput from "../components/GlassInput";
import GlassButton from "../components/GlassButton";
import { Feather } from "@expo/vector-icons";
import { Flat, GroupType } from "../types";
import Chip from "../components/Chip";
import SegmentedControl from "../components/SegmentedControl";

type Props = NativeStackScreenProps<AppStackParamList, "Profile">;

const GROUP_ICON: Record<GroupType, keyof typeof Feather.glyphMap> = {
  FLAT: "home",
  TRIP: "compass",
  PARTY: "gift",
  OFFICE: "briefcase",
};

const GROUP_TYPES: { value: GroupType; label: string }[] = [
  { value: "FLAT", label: "Flat" },
  { value: "TRIP", label: "Trip" },
  { value: "PARTY", label: "Party" },
  { value: "OFFICE", label: "Office" },
];

export default function ProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [flats, setFlats] = useState<Flat[]>([]);
  const [loadingFlats, setLoadingFlats] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);

  const [actionTab, setActionTab] = useState<"create" | "join">("create");
  const [flatName, setFlatName] = useState("");
  const [groupType, setGroupType] = useState<GroupType>("FLAT");
  const [creating, setCreating] = useState(false);

  // Handle creating a flat
  async function handleCreateFlat() {
    const trimmedName = flatName.trim();
    if (!trimmedName) {
      Alert.alert("Error", "Please enter a flat name.");
      return;
    }

    setCreating(true);
    try {
      const { data } = await FlatApi.create(trimmedName, groupType);
      Alert.alert("Success", `Flat "${data.name}" created!\nShare invite code "${data.inviteCode}" with your roommates.`);
      setFlatName("");
      setGroupType("FLAT");
      
      // Navigate to the newly created flat detail screen
      navigation.navigate("FlatDetail", { flatId: data.id, flatName: data.name });
    } catch (err) {
      Alert.alert("Couldn't create flat", apiErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  // Load flats the user belongs to
  const loadFlats = useCallback(async () => {
    setLoadingFlats(true);
    try {
      const { data } = await FlatApi.list();
      setFlats(data);
    } catch (err) {
      Alert.alert("Error", "Could not load your flats.");
    } finally {
      setLoadingFlats(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFlats();
    }, [loadFlats])
  );

  // Handle joining another flat
  async function handleJoinFlat() {
    const trimmedCode = inviteCode.trim();
    if (!trimmedCode) {
      Alert.alert("Error", "Please enter an invite code.");
      return;
    }

    setJoining(true);
    try {
      const { data } = await FlatApi.join(trimmedCode);
      Alert.alert("Success", `You have successfully joined "${data.name}"!`);
      setInviteCode("");
      
      // Navigate to the newly joined flat detail screen
      navigation.navigate("FlatDetail", { flatId: data.flatId, flatName: data.name });
    } catch (err) {
      Alert.alert("Couldn't join flat", apiErrorMessage(err));
    } finally {
      setJoining(false);
    }
  }

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "?";

  return (
    <Screen edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* User Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{userInitial}</Text>
            </View>
            <Text style={styles.userName}>{user?.name ?? "User"}</Text>
            <Text style={styles.userEmail}>{user?.email ?? "No Email"}</Text>
          </View>

          {/* Create or Join Flat Card */}
          <GlassCard style={styles.card}>
            <SegmentedControl
              options={[
                { value: "create", label: "Create Flat" },
                { value: "join", label: "Join Flat" },
              ]}
              value={actionTab}
              onChange={setActionTab}
            />

            <View style={{ marginTop: 16 }}>
              {actionTab === "create" ? (
                <View>
                  <View style={styles.sectionHeader}>
                    <Feather name="plus-circle" size={18} color={colors.accent} />
                    <Text style={styles.sectionTitle}>Create New Flat</Text>
                  </View>
                  <Text style={styles.sectionDescription}>
                    Start a new flat group to track and split expenses with roommates.
                  </Text>

                  <Text style={styles.inputLabel}>Group Type</Text>
                  <View style={styles.chipsRow}>
                    {GROUP_TYPES.map((g) => (
                      <Chip
                        key={g.value}
                        label={g.label}
                        selected={groupType === g.value}
                        onPress={() => setGroupType(g.value)}
                      />
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>Flat Name</Text>
                  <GlassInput
                    placeholder="e.g. Baker Street 221B"
                    value={flatName}
                    onChangeText={setFlatName}
                    style={styles.input}
                  />
                  <GlassButton
                    label="Create Flat Group"
                    onPress={handleCreateFlat}
                    loading={creating}
                    disabled={!flatName.trim()}
                    variant="primary"
                  />
                </View>
              ) : (
                <View>
                  <View style={styles.sectionHeader}>
                    <Feather name="log-in" size={18} color={colors.accent} />
                    <Text style={styles.sectionTitle}>Join Another Flat</Text>
                  </View>
                  <Text style={styles.sectionDescription}>
                    Enter an invite code shared by another flat owner to join their flat group.
                  </Text>
                  <GlassInput
                    placeholder="Invite Code (e.g. ABCD-1234)"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    value={inviteCode}
                    onChangeText={setInviteCode}
                    style={styles.input}
                  />
                  <GlassButton
                    label="Join Flat Group"
                    onPress={handleJoinFlat}
                    loading={joining}
                    disabled={!inviteCode.trim()}
                    variant="primary"
                  />
                </View>
              )}
            </View>
          </GlassCard>

          {/* User's Flats Section */}
          <View style={styles.flatsSection}>
            <View style={styles.sectionHeader}>
              <Feather name="home" size={18} color={colors.accent} />
              <Text style={styles.sectionTitle}>Your Current Flats</Text>
            </View>

            {loadingFlats && flats.length === 0 ? (
              <ActivityIndicator color={colors.accent} style={styles.loader} />
            ) : flats.length === 0 ? (
              <GlassCard style={styles.emptyCard}>
                <Text style={styles.emptyText}>You are not in any flats yet.</Text>
              </GlassCard>
            ) : (
              flats.map((flat) => (
                <TouchableOpacity
                  key={flat.id}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate("FlatDetail", { flatId: flat.id, flatName: flat.name })}
                >
                  <GlassCard style={styles.flatCard}>
                    <View style={styles.flatIcon}>
                      <Feather name={GROUP_ICON[flat.groupType] || "home"} size={16} color={colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.flatName}>{flat.name}</Text>
                      <Text style={styles.flatMeta}>
                        {flat.members.length} member{flat.members.length !== 1 ? "s" : ""} • Code: {flat.inviteCode}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={colors.textSecondary} />
                  </GlassCard>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Sign Out Action */}
          <GlassButton
            label="Sign Out"
            onPress={logout}
            variant="danger"
            style={styles.signOutButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    container: {
      padding: 20,
      paddingBottom: 40,
    },
    profileHeader: {
      alignItems: "center",
      marginVertical: 20,
    },
    avatarContainer: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: c.accentSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
      borderWidth: 2,
      borderColor: c.accent,
    },
    avatarText: {
      fontSize: 28,
      fontWeight: "800",
      color: c.accent,
    },
    userName: {
      fontSize: 22,
      fontWeight: "800",
      color: c.textPrimary,
    },
    userEmail: {
      fontSize: 14,
      color: c.textSecondary,
      marginTop: 4,
    },
    card: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 10,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: c.textPrimary,
    },
    sectionDescription: {
      fontSize: 13,
      color: c.textSecondary,
      marginBottom: 14,
      lineHeight: 18,
    },
    input: {
      marginBottom: 12,
    },
    chipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: c.textSecondary,
      marginBottom: 6,
    },
    flatsSection: {
      marginBottom: 24,
    },
    loader: {
      marginVertical: 20,
    },
    emptyCard: {
      padding: 20,
      alignItems: "center",
    },
    emptyText: {
      color: c.textSecondary,
      fontSize: 14,
    },
    flatCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 8,
    },
    flatIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: c.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    flatName: {
      fontSize: 15,
      fontWeight: "800",
      color: c.textPrimary,
    },
    flatMeta: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
    },
    signOutButton: {
      marginTop: 10,
    },
  });
}
