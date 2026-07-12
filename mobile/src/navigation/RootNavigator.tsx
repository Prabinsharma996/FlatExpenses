import React from "react";
import { ActivityIndicator, TouchableOpacity } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import { Feather } from "@expo/vector-icons";
import type { AuthStackParamList, AppStackParamList } from "./types";
import Screen from "../components/Screen";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import FlatsScreen from "../screens/FlatsScreen";
import CreateFlatScreen from "../screens/CreateFlatScreen";
import FlatDetailScreen from "../screens/FlatDetailScreen";
import CreateBookScreen from "../screens/CreateBookScreen";
import BookDetailScreen from "../screens/BookDetailScreen";
import AddExpenseScreen from "../screens/AddExpenseScreen";
import ProfileScreen from "../screens/ProfileScreen";


const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  const { colors } = useTheme();
  return (
    <AppStack.Navigator
      screenOptions={({ route, navigation }) => ({
        headerTintColor: colors.accent,
        headerStyle: { backgroundColor: colors.card },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "800", color: colors.textPrimary },
        headerRight: route.name !== "Profile" && route.name !== "Flats" ? () => (
          <TouchableOpacity
            onPress={() => navigation.navigate("Profile")}
            activeOpacity={0.7}
            style={{ padding: 4 }}
          >
            <Feather name="user" size={20} color={colors.accent} />
          </TouchableOpacity>
        ) : undefined,
      })}
    >
      <AppStack.Screen name="Flats" component={FlatsScreen} options={{ headerShown: false }} />
      <AppStack.Screen name="CreateFlat" component={CreateFlatScreen} options={{ title: "Create / Join Flat" }} />
      <AppStack.Screen name="FlatDetail" component={FlatDetailScreen} options={{ headerShown: false }} />
      <AppStack.Screen name="CreateBook" component={CreateBookScreen} options={{ title: "New Book" }} />
      <AppStack.Screen name="BookDetail" component={BookDetailScreen} options={{ title: "Book" }} />
      <AppStack.Screen name="AddExpense" component={AddExpenseScreen} options={{ title: "Add Expense" }} />
      <AppStack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />

    </AppStack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator size="large" color={colors.accent} style={{ flex: 1 }} />
      </Screen>
    );
  }

  return <NavigationContainer>{user ? <AppNavigator /> : <AuthNavigator />}</NavigationContainer>;
}
