import React, { useState } from "react";
import { Alert, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../navigation/types";
import { FlatApi } from "../api/endpoints";
import { apiErrorMessage } from "../api/client";
import { GroupType } from "../types";
import Screen from "../components/Screen";
import FlatOnboardingForm from "../components/FlatOnboardingForm";

type Props = NativeStackScreenProps<AppStackParamList, "CreateFlat">;

export default function CreateFlatScreen({ navigation, route }: Props) {
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  async function handleCreate(name: string, groupType: GroupType) {
    if (!name) return;
    setCreating(true);
    try {
      const { data } = await FlatApi.create(name, groupType);
      Alert.alert("Flat created", `Share invite code "${data.inviteCode}" with your roommates.`);
      navigation.replace("FlatDetail", { flatId: data.id, flatName: data.name });
    } catch (err) {
      Alert.alert("Couldn't create flat", apiErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(inviteCode: string) {
    if (!inviteCode) return;
    setJoining(true);
    try {
      const { data } = await FlatApi.join(inviteCode);
      navigation.replace("FlatDetail", { flatId: data.flatId, flatName: data.name });
    } catch (err) {
      Alert.alert("Couldn't join flat", apiErrorMessage(err));
    } finally {
      setJoining(false);
    }
  }

  return (
    <Screen edges={["bottom"]} contentStyle={styles.content}>
      <FlatOnboardingForm
        initialTab={route.params?.initialTab ?? "create"}
        creating={creating}
        joining={joining}
        onCreate={handleCreate}
        onJoin={handleJoin}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
});
