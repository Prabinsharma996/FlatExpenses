import React, { useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import MembersTabScreen from "./MembersTabScreen";
import ChoresTabScreen from "./ChoresTabScreen";
import VotingTabScreen from "./VotingTabScreen";
import GlassCard from "../../components/GlassCard";
import { useTheme } from "../../theme/ThemeContext";
import { Palette } from "../../theme/colors";

type FeatureKey = "menu" | "chores" | "voting" | "members";

export default function MoreTabScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const navigation = useNavigation<any>();
  const [activeFeature, setActiveFeature] = useState<FeatureKey>("menu");

  function handleEmailPress() {
    Linking.openURL("mailto:prabin.sharmaa67@gmail.com").catch(() => {
      Alert.alert("Developer Email", "prabin.sharmaa67@gmail.com");
    });
  }

  if (activeFeature !== "menu") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Top Header Bar to navigate back to vertical list */}
        <View style={[styles.activeHeader, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setActiveFeature("menu")}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={18} color={colors.accent} />
            <Text style={[styles.backText, { color: colors.accent }]}>All Features</Text>
          </TouchableOpacity>
          <Text style={[styles.activeTitle, { color: colors.textPrimary }]}>
            {activeFeature === "chores" && "Chore Roster"}
            {activeFeature === "voting" && "Flat Polls"}
            {activeFeature === "members" && "Flat Members"}
          </Text>
        </View>

        {/* Selected Feature Screen View */}
        <View style={{ flex: 1 }}>
          {activeFeature === "chores" && <ChoresTabScreen />}
          {activeFeature === "voting" && <VotingTabScreen />}
          {activeFeature === "members" && <MembersTabScreen />}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Features Section Title ── */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Flat Features</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Select a feature below to view chores, voting, or flat members
        </Text>

        {/* ── Vertical Features List ── */}
        <View style={styles.verticalList}>
          {/* 1. Chore Roster */}
          <TouchableOpacity
            style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => setActiveFeature("chores")}
            activeOpacity={0.8}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
              <Feather name="check-circle" size={22} color={colors.accent} />
            </View>
            <View style={styles.featureInfo}>
              <Text style={[styles.featureName, { color: colors.textPrimary }]}>
                Chore Roster & Duty Scheduler
              </Text>
              <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
                Assign weekly chores & pass turns automatically
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* 2. Polls & Voting */}
          <TouchableOpacity
            style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => setActiveFeature("voting")}
            activeOpacity={0.8}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
              <Feather name="check-square" size={22} color={colors.accent} />
            </View>
            <View style={styles.featureInfo}>
              <Text style={[styles.featureName, { color: colors.textPrimary }]}>
                House Polls & Voting
              </Text>
              <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
                Create polls & vote on house decisions
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* 3. Flat Members */}
          <TouchableOpacity
            style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => setActiveFeature("members")}
            activeOpacity={0.8}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
              <Feather name="users" size={22} color={colors.accent} />
            </View>
            <View style={styles.featureInfo}>
              <Text style={[styles.featureName, { color: colors.textPrimary }]}>
                Flat Members & Roles
              </Text>
              <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
                View roommates, admin badges & flat invite code
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* 4. App Feature Guide */}
          <TouchableOpacity
            style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => navigation.navigate("Onboarding")}
            activeOpacity={0.8}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
              <Feather name="help-circle" size={22} color={colors.accent} />
            </View>
            <View style={styles.featureInfo}>
              <Text style={[styles.featureName, { color: colors.textPrimary }]}>
                App Feature Showcase
              </Text>
              <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
                Revisit onboarding guide & feature slides
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ── About App Section ── */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 24 }]}>
          About App
        </Text>
        <GlassCard style={styles.aboutCard}>
          <View style={styles.aboutHeader}>
            <View style={[styles.appLogo, { backgroundColor: colors.accentSoft }]}>
              <Feather name="home" size={24} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.appName, { color: colors.textPrimary }]}>FlatSplit</Text>
              <Text style={[styles.appVersion, { color: colors.textSecondary }]}>Version 1.0.0</Text>
            </View>
            <View style={[styles.statusTag, { backgroundColor: colors.accentSoft }]}>
              <Text style={[styles.statusTagText, { color: colors.accent }]}>Official</Text>
            </View>
          </View>

          <Text style={[styles.appBio, { color: colors.textSecondary }]}>
            FlatSplit is a turn-based Roommate Chore Roster, Duty Scheduler & Shared Expense Management app designed to keep your household organized and fair.
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          {/* Developer Details */}
          <View style={styles.devSection}>
            <Text style={[styles.devLabel, { color: colors.textSecondary }]}>DEVELOPER INFORMATION</Text>
            
            <View style={styles.infoRow}>
              <View style={[styles.infoIconWrap, { backgroundColor: colors.input }]}>
                <Feather name="user" size={14} color={colors.accent} />
              </View>
              <View>
                <Text style={[styles.infoTitle, { color: colors.textSecondary }]}>Developed By</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>Prabin Kumar Sharma</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.infoRow} onPress={handleEmailPress} activeOpacity={0.75}>
              <View style={[styles.infoIconWrap, { backgroundColor: colors.accentSoft }]}>
                <Feather name="mail" size={14} color={colors.accent} />
              </View>
              <View>
                <Text style={[styles.infoTitle, { color: colors.textSecondary }]}>Gmail</Text>
                <Text style={[styles.infoValue, { color: colors.accent, textDecorationLine: "underline" }]}>
                  prabin.sharmaa67@gmail.com
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </ScrollView>
    </View>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 40,
    },
    activeHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    backBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 4,
      paddingRight: 10,
    },
    backText: {
      fontSize: 14,
      fontWeight: "700",
    },
    activeTitle: {
      fontSize: 16,
      fontWeight: "800",
    },

    sectionTitle: {
      fontSize: 20,
      fontWeight: "800",
      letterSpacing: -0.3,
    },
    sectionSubtitle: {
      fontSize: 13,
      marginTop: 2,
      marginBottom: 16,
    },

    verticalList: {
      gap: 12,
    },
    featureCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderRadius: 18,
      borderWidth: 1,
      gap: 14,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    featureInfo: {
      flex: 1,
    },
    featureName: {
      fontSize: 15,
      fontWeight: "700",
      marginBottom: 2,
    },
    featureDesc: {
      fontSize: 12,
    },

    aboutCard: {
      marginTop: 12,
      padding: 18,
    },
    aboutHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 12,
    },
    appLogo: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    appName: {
      fontSize: 18,
      fontWeight: "800",
    },
    appVersion: {
      fontSize: 12,
      fontWeight: "600",
      marginTop: 1,
    },
    statusTag: {
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 10,
    },
    statusTagText: {
      fontSize: 11,
      fontWeight: "800",
    },

    appBio: {
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 14,
    },
    divider: {
      height: 1,
      marginVertical: 14,
    },

    devSection: {
      gap: 12,
    },
    devLabel: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    infoIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    infoTitle: {
      fontSize: 11,
      fontWeight: "600",
    },
    infoValue: {
      fontSize: 14,
      fontWeight: "700",
    },
  });
}
