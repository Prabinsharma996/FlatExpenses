import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Palette } from "../theme/colors";
import { useTheme } from "../theme/ThemeContext";
import { GroupType } from "../types";
import GlassCard from "./GlassCard";
import GlassInput from "./GlassInput";
import GlassButton from "./GlassButton";
import Chip from "./Chip";
import SegmentedControl from "./SegmentedControl";

const GROUP_TYPES: { value: GroupType; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { value: "FLAT", label: "Flat", icon: "home" },
  { value: "TRIP", label: "Trip", icon: "compass" },
  { value: "PARTY", label: "Party", icon: "gift" },
  { value: "OFFICE", label: "Office", icon: "briefcase" },
];

type Props = {
  initialTab?: "create" | "join";
  creating: boolean;
  joining: boolean;
  onCreate: (name: string, groupType: GroupType) => void;
  onJoin: (inviteCode: string) => void;
};

export default function FlatOnboardingForm({ initialTab = "create", creating, joining, onCreate, onJoin }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [tab, setTab] = useState<"create" | "join">(initialTab);
  const [name, setName] = useState("");
  const [groupType, setGroupType] = useState<GroupType>("FLAT");
  const [inviteCode, setInviteCode] = useState("");

  const activeIcon = GROUP_TYPES.find((g) => g.value === groupType)!.icon;

  return (
    <View style={styles.wrap}>
      <SegmentedControl
        options={[
          { value: "create", label: "Create Flat" },
          { value: "join", label: "Join Flat" },
        ]}
        value={tab}
        onChange={setTab}
      />

      <GlassCard strong style={styles.card}>
        <View style={styles.iconPreview}>
          <Feather name={tab === "create" ? activeIcon : "key"} size={28} color={colors.accent} />
        </View>

        {tab === "create" ? (
          <>
            <Text style={styles.label}>Group Type</Text>
            <View style={styles.chipsRow}>
              {GROUP_TYPES.map((g) => (
                <Chip key={g.value} label={g.label} selected={groupType === g.value} onPress={() => setGroupType(g.value)} />
              ))}
            </View>

            <Text style={styles.label}>Flat Name</Text>
            <GlassInput placeholder="e.g. Baker Street 221B" value={name} onChangeText={setName} style={styles.input} />

            <GlassButton
              label="Create Flat"
              onPress={() => onCreate(name.trim(), groupType)}
              loading={creating}
              disabled={!name.trim()}
            />
          </>
        ) : (
          <>
            <Text style={styles.label}>Invite Code</Text>
            <GlassInput
              placeholder="e.g. aB3xQ9kZ"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="none"
              style={styles.input}
            />
            <GlassButton
              label="Join Flat"
              onPress={() => onJoin(inviteCode.trim())}
              loading={joining}
              disabled={!inviteCode.trim()}
            />
          </>
        )}
      </GlassCard>
    </View>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    wrap: { gap: 20 },
    card: { alignItems: "stretch" },
    iconPreview: {
      alignSelf: "center",
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: c.accentSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 18,
    },
    label: { fontSize: 13, color: c.textSecondary, fontWeight: "700", marginBottom: 10 },
    chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
    input: { marginBottom: 18 },
  });
}
