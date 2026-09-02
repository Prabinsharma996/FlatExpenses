import React, { useMemo, useState } from "react";
import { Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../navigation/types";
import { BookApi } from "../api/endpoints";
import { apiErrorMessage } from "../api/client";
import Screen from "../components/Screen";
import GlassCard from "../components/GlassCard";
import GlassInput from "../components/GlassInput";
import GlassButton from "../components/GlassButton";
import { Palette } from "../theme/colors";
import { useTheme } from "../theme/ThemeContext";

type Props = NativeStackScreenProps<AppStackParamList, "CreateBook">;

export default function CreateBookScreen({ route, navigation }: Props) {
  const { flatId } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const { data } = await BookApi.create(flatId, name.trim());
      navigation.replace("BookDetail", { bookId: data.id, bookName: data.name, flatId });
    } catch (err) {
      Alert.alert("Couldn't create book", apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          keyboardShouldPersistTaps="handled"
        >
          <GlassCard strong style={styles.card}>
            <Text style={styles.label}>Book name</Text>
            <GlassInput placeholder="e.g. July Groceries" value={name} onChangeText={setName} autoFocus style={styles.input} />
            <GlassButton label="Create Book" onPress={handleCreate} loading={loading} disabled={!name.trim()} />
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    card: { margin: 20 },
    label: { fontSize: 13, color: c.textSecondary, fontWeight: "700", marginBottom: 8 },
    input: { marginBottom: 18 },
  });
}
