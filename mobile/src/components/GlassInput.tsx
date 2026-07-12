import React from "react";
import { StyleSheet, TextInput, TextInputProps } from "react-native";
import { useTheme } from "../theme/ThemeContext";

export default function GlassInput(props: TextInputProps) {
  const { colors } = useTheme();
  return (
    <TextInput
      placeholderTextColor={colors.textTertiary}
      {...props}
      style={[
        styles.input,
        { backgroundColor: colors.input, borderColor: colors.inputBorder, color: colors.textPrimary },
        props.style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
  },
});
