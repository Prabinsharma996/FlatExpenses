import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, RefreshControl, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import { Feather } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import GlassCard from "../../components/GlassCard";
import GlassButton from "../../components/GlassButton";
import GlassInput from "../../components/GlassInput";
import { useFlat } from "../../context/FlatContext";
import { useAuth } from "../../context/AuthContext";
import { FlatApi } from "../../api/endpoints";
import { apiErrorMessage } from "../../api/client";
import { Flat } from "../../types";
import { Palette } from "../../theme/colors";
import { useTheme } from "../../theme/ThemeContext";

export default function MembersTabScreen() {
  const { flatId, flatName } = useFlat();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [flat, setFlat] = useState<Flat | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [addingGuest, setAddingGuest] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await FlatApi.detail(flatId);
      setFlat(data);
    } catch (err) {
      Alert.alert("Couldn't load members", apiErrorMessage(err));
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

  async function handleCopyCode() {
    if (!flat?.inviteCode) return;
    await Clipboard.setStringAsync(flat.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShareInvite() {
    if (!flat?.inviteCode) return;
    try {
      await Share.share({
        message: `Join "${flat.name}" on FlatSplit! Use invite code ${flat.inviteCode} to jump in and split expenses with us.`,
      });
    } catch (err) {
      Alert.alert("Couldn't share invite", apiErrorMessage(err));
    }
  }

  async function handleAddGuest() {
    if (!guestName.trim()) return;
    setAddingGuest(true);
    try {
      await FlatApi.addGuest(flatId, guestName.trim());
      setGuestName("");
      load();
    } catch (err) {
      Alert.alert("Couldn't add guest", apiErrorMessage(err));
    } finally {
      setAddingGuest(false);
    }
  }

  async function handleRemoveMember(userId: number, name: string) {
    Alert.alert("Remove member?", `${name} will lose access to ${flat?.name ?? "this flat"}.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await FlatApi.removeMember(flatId, userId);
            load();
          } catch (err) {
            Alert.alert("Couldn't remove member", apiErrorMessage(err));
          }
        },
      },
    ]);
  }

  const members = flat?.members ?? [];
  const isAdmin = !!flat && !!user && flat.adminId === user.id;

  return (
    <Screen edges={[]}>
      <FlatList
        data={members}
        keyExtractor={(m) => String(m.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Members</Text>
            <Text style={styles.subtitle}>{flatName}</Text>

            <GlassCard strong style={styles.inviteCard}>
              <View style={styles.inviteHeaderRow}>
                <Feather name="user-plus" size={16} color={colors.accent} />
                <Text style={styles.inviteTitle}>Invite Friends</Text>
              </View>
              <Text style={styles.inviteSubtitle}>Share this code to invite to {flatName}</Text>

              <View style={styles.codeRow}>
                <Text style={styles.codeText}>{flat?.inviteCode ?? "……"}</Text>
                <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode} disabled={!flat}>
                  <Feather name="copy" size={13} color={colors.onAccent} />
                  <Text style={styles.copyButtonText}>{copied ? "Copied ✓" : "Copy"}</Text>
                </TouchableOpacity>
              </View>

              <GlassButton label="Share invite" icon="📤" variant="glass" onPress={handleShareInvite} disabled={!flat} />
            </GlassCard>

            <GlassCard style={styles.guestCard}>
              <View style={styles.inviteHeaderRow}>
                <Feather name="user" size={16} color={colors.textPrimary} />
                <Text style={styles.inviteTitle}>Add Temporary Guest</Text>
              </View>
              <Text style={styles.inviteSubtitle}>Add a virtual member to split expenses with</Text>
              <View style={styles.guestRow}>
                <GlassInput
                  placeholder="Guest Name"
                  value={guestName}
                  onChangeText={setGuestName}
                  style={styles.guestInput}
                />
                <GlassButton label="Add Guest" onPress={handleAddGuest} loading={addingGuest} disabled={!guestName.trim()} style={styles.guestBtn} />
              </View>
            </GlassCard>

            <Text style={styles.sectionTitle}>{members.length} member{members.length === 1 ? "" : "s"}</Text>
          </View>
        }
        ListEmptyComponent={!flat ? <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} /> : null}
        renderItem={({ item }) => (
          <GlassCard style={styles.memberCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.user.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>
                {item.user.name}
                {item.userId === user?.id ? " (you)" : ""}
                {item.userId === flat?.adminId ? "  👑" : ""}
              </Text>
              {item.user.isGuest ? (
                <View style={styles.guestTag}>
                  <Text style={styles.guestTagText}>Guest</Text>
                </View>
              ) : (
                <Text style={styles.memberEmail}>{item.user.email}</Text>
              )}
            </View>
            {item.userId === flat?.adminId && (
              <View style={styles.adminPill}>
                <Text style={styles.adminPillText}>admin</Text>
              </View>
            )}
            {isAdmin && item.userId !== flat?.adminId && (
              <TouchableOpacity onPress={() => handleRemoveMember(item.userId, item.user.name)} style={styles.removeBtn}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            )}
          </GlassCard>
        )}
      />
    </Screen>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    list: { padding: 20, paddingBottom: 40, gap: 12 },
    title: { fontSize: 22, fontWeight: "800", color: c.textPrimary },
    subtitle: { fontSize: 13, color: c.textSecondary, marginTop: 2, marginBottom: 16 },

    inviteHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    inviteCard: { marginBottom: 14, gap: 12 },
    inviteTitle: { fontSize: 16, fontWeight: "800", color: c.textPrimary },
    inviteSubtitle: { fontSize: 13, color: c.textSecondary, marginTop: -6 },
    codeRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.accentBorder,
      borderStyle: "dashed",
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    codeText: { fontSize: 18, fontWeight: "800", letterSpacing: 2, color: c.accent },
    copyButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.accent,
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    copyButtonText: { color: c.onAccent, fontWeight: "700", fontSize: 13 },

    guestCard: { marginBottom: 20, gap: 10 },
    guestRow: { flexDirection: "row", gap: 10, alignItems: "center" },
    guestInput: { flex: 1 },
    guestBtn: { paddingHorizontal: 16 },

    sectionTitle: { fontSize: 14, fontWeight: "800", color: c.textPrimary, marginBottom: 4 },

    memberCard: { flexDirection: "row", alignItems: "center", gap: 12 },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { color: c.onAccent, fontWeight: "800", fontSize: 16 },
    memberName: { fontSize: 15, fontWeight: "700", color: c.textPrimary },
    memberEmail: { fontSize: 12, color: c.textTertiary, marginTop: 2 },
    guestTag: { alignSelf: "flex-start", backgroundColor: c.input, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 6, marginTop: 3 },
    guestTagText: { fontSize: 11, fontWeight: "700", color: c.textSecondary },
    adminPill: { backgroundColor: c.accentSoft, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
    adminPillText: { fontSize: 11, fontWeight: "700", color: c.accent },
    removeBtn: { paddingVertical: 6, paddingHorizontal: 10 },
    removeText: { color: c.danger, fontWeight: "700", fontSize: 12 },
  });
}
