import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { useTheme } from "../theme/ThemeContext";

export type DonutSlice = { label: string; value: number; color: string };

type Props = {
  data: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
};

// Ring/donut chart built from stacked SVG circle strokes (no third-party chart lib needed).
// Each slice is one dashed circle rotated into place by its cumulative fraction of the total.
export default function DonutChart({ data, size = 200, strokeWidth = 30, centerLabel, centerValue }: Props) {
  const { colors } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((s, d) => s + d.value, 0);

  const gap = data.filter((d) => d.value > 0).length > 1 ? 3 : 0;
  let cumulativeLength = 0;
  const segments = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const fraction = total > 0 ? d.value / total : 0;
      const length = Math.max(fraction * circumference - gap, 0);
      const offset = -cumulativeLength;
      cumulativeLength += fraction * circumference;
      return { ...d, length, offset };
    });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.divider} strokeWidth={strokeWidth} fill="none" />
          {segments.map((s, i) => (
            <Circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={s.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${s.length} ${circumference - s.length}`}
              strokeDashoffset={s.offset}
              strokeLinecap="round"
              fill="none"
            />
          ))}
        </G>
      </Svg>
      {(centerLabel || centerValue) && (
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          {!!centerValue && <Text style={[styles.centerValue, { color: colors.textPrimary }]}>{centerValue}</Text>}
          {!!centerLabel && <Text style={[styles.centerLabel, { color: colors.textSecondary }]}>{centerLabel}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  centerValue: { fontSize: 22, fontWeight: "800" },
  centerLabel: { fontSize: 12, fontWeight: "600", marginTop: 2 },
});
