import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";

type Props = {
  children?: React.ReactNode;
  edges?: Edge[];
  contentStyle?: ViewStyle;
};

// Flat, solid-background page wrapper used by every screen.
export default function Screen({ children, edges = ["top", "bottom"], contentStyle }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <SafeAreaView style={[styles.fill, contentStyle]} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
