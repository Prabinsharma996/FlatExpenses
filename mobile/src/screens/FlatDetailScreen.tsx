import React from "react";
import { StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList, FlatTabParamList } from "../navigation/types";
import { FlatProvider } from "../context/FlatContext";
import { useTheme } from "../theme/ThemeContext";
import FlatHeader from "../components/FlatHeader";

import HomeTabScreen from "./flat-tabs/HomeTabScreen";
import ExpensesTabScreen from "./flat-tabs/ExpensesTabScreen";
import BalancesTabScreen from "./flat-tabs/BalancesTabScreen";
import MembersTabScreen from "./flat-tabs/MembersTabScreen";
import BooksTabScreen from "./flat-tabs/BooksTabScreen";
import VotingTabScreen from "./flat-tabs/VotingTabScreen";

type Props = NativeStackScreenProps<AppStackParamList, "FlatDetail">;

const Tab = createBottomTabNavigator<FlatTabParamList>();

const TAB_ICON: Record<keyof FlatTabParamList, keyof typeof Feather.glyphMap> = {
  Home: "home",
  Expenses: "dollar-sign",
  Balances: "repeat",
  Members: "users",
  Books: "calendar",
  Voting: "check-square",
};

export default function FlatDetailScreen({ route }: Props) {
  const { flatId, flatName } = route.params;
  const { colors } = useTheme();

  return (
    <FlatProvider flatId={flatId} flatName={flatName}>
      <Tab.Navigator
        screenOptions={({ route: r }) => ({
          headerShown: true,
          header: () => <FlatHeader title={flatName} />,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.tabInactive,
          tabBarStyle: [styles.tabBar, { backgroundColor: colors.tabBar, borderTopColor: colors.tabBarBorder }],
          tabBarLabelStyle: styles.tabLabel,
          tabBarIcon: ({ color, size }) => (
            <Feather name={TAB_ICON[r.name as keyof FlatTabParamList]} size={size ?? 20} color={color} />
          ),
        })}
      >
        <Tab.Screen name="Home" component={HomeTabScreen} />
        <Tab.Screen name="Expenses" component={ExpensesTabScreen} />
        <Tab.Screen name="Balances" component={BalancesTabScreen} />
        <Tab.Screen name="Members" component={MembersTabScreen} />
        <Tab.Screen name="Books" component={BooksTabScreen} />
        <Tab.Screen name="Voting" component={VotingTabScreen} />
      </Tab.Navigator>
    </FlatProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    height: 62,
    paddingTop: 6,
  },
  tabLabel: { fontSize: 11, fontWeight: "700", marginBottom: 4 },
});
