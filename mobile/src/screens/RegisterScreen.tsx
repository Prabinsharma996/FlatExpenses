import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  View,
  TextInput,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../api/client";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../navigation/types";
import Screen from "../components/Screen";
import GlassCard from "../components/GlassCard";
import GlassButton from "../components/GlassButton";
import { Palette } from "../theme/colors";
import { useTheme } from "../theme/ThemeContext";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name.trim()) { Alert.alert("Required", "Please enter your name."); return; }
    if (!email.trim()) { Alert.alert("Required", "Please enter your email."); return; }
    if (password.length < 6) { Alert.alert("Too short", "Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
    } catch (err) {
      Alert.alert("Registration failed", apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandWrap}>
            <View style={[styles.logoMark, { backgroundColor: colors.accentSoft }]}>
              <Feather name="user-plus" size={26} color={colors.accent} />
            </View>
            <Text style={styles.brand}>Create account</Text>
            <Text style={styles.tagline}>Join FlatSplit and start splitting fairly</Text>
          </View>

          <GlassCard strong style={styles.card}>
            <Text style={styles.cardTitle}>Get started</Text>

            {/* Name */}
            <Text style={styles.inputLabel}>Full Name</Text>
            <View style={styles.inputWrap}>
              <Feather name="user" size={16} color={colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.input, borderColor: colors.inputBorder }]}
                placeholder="Your full name"
                placeholderTextColor={colors.textTertiary}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Email */}
            <Text style={[styles.inputLabel, { marginTop: 14 }]}>Email</Text>
            <View style={styles.inputWrap}>
              <Feather name="mail" size={16} color={colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.input, borderColor: colors.inputBorder }]}
                placeholder="you@example.com"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Password */}
            <Text style={[styles.inputLabel, { marginTop: 14 }]}>Password</Text>
            <View style={styles.inputWrap}>
              <Feather name="lock" size={16} color={colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.input, borderColor: colors.inputBorder }]}
                placeholder="Min 6 characters"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeBtn}
                activeOpacity={0.7}
              >
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <GlassButton label="Sign Up" onPress={handleRegister} loading={loading} style={styles.button} />

            <TouchableOpacity onPress={() => navigation.navigate("Login")} activeOpacity={0.7}>
              <Text style={styles.link}>Already have an account? <Text style={{ color: colors.accent }}>Log in</Text></Text>
            </TouchableOpacity>
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    scrollContainer: { flexGrow: 1, justifyContent: "center", padding: 24 },
    brandWrap: { alignItems: "center", marginBottom: 32 },
    logoMark: {
      width: 64,
      height: 64,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    brand: { fontSize: 30, fontWeight: "800", color: c.textPrimary, letterSpacing: -0.5 },
    tagline: { textAlign: "center", color: c.textSecondary, marginTop: 6, fontSize: 13, lineHeight: 19 },
    card: {},
    cardTitle: { fontSize: 18, fontWeight: "800", color: c.textPrimary, marginBottom: 18 },
    inputLabel: { fontSize: 12, fontWeight: "700", color: c.textSecondary, marginBottom: 6 },
    inputWrap: { position: "relative", justifyContent: "center" },
    inputIcon: { position: "absolute", left: 14, zIndex: 1 },
    input: {
      borderWidth: 1,
      borderRadius: 14,
      paddingVertical: 14,
      paddingLeft: 42,
      paddingRight: 48,
      fontSize: 15,
    },
    eyeBtn: { position: "absolute", right: 14, padding: 2 },
    button: { marginTop: 22, marginBottom: 18 },
    link: { color: c.textSecondary, textAlign: "center", fontWeight: "600", fontSize: 13 },
  });
}
