import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Colors } from "@/lib/theme";
import { formatPercent, riskColor, riskLabel, riskLevel } from "@/lib/voxguard";

type Props = {
  value: number | null;
  active: boolean;
  level: number;
};

const RADIUS = 86;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SIZE = 224; // 56 * 4

/** Circular live risk indicator — mirrors the web RiskDial. */
export function RiskDial({ value, active, level }: Props) {
  const pct = value ?? 0;
  const color = riskColor(riskLevel(pct));
  const strokeDashoffset = CIRCUMFERENCE * (1 - pct);

  // Pulse ring animation
  const pulseAnim = useRef(new Animated.Value(0.92)).current;
  const pulseOpacity = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.parallel([
        Animated.timing(pulseAnim, {
          toValue: 1.35,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      pulseAnim.setValue(0.92);
      pulseOpacity.setValue(0.7);
    };
  }, [active, pulseAnim, pulseOpacity]);

  // Glow scale animation
  const glowScale = 0.85 + level * 0.35;

  return (
    <View style={styles.container}>
      {active && (
        <Animated.View
          style={[
            styles.pulseRing,
            {
              borderColor: color,
              transform: [{ scale: pulseAnim }],
              opacity: pulseOpacity,
            },
          ]}
        />
      )}

      {/* Inner glow */}
      <Animated.View
        style={[
          styles.glow,
          {
            backgroundColor: color + "26", // ~15% alpha
            transform: [{ scale: glowScale }],
          },
        ]}
      />

      {/* SVG arc */}
      <Svg width={SIZE} height={SIZE} viewBox="0 0 200 200" style={styles.svg}>
        {/* Track */}
        <Circle
          cx="100"
          cy="100"
          r={RADIUS}
          fill="none"
          stroke={Colors.border}
          strokeWidth="10"
        />
        {/* Progress arc */}
        <Circle
          cx="100"
          cy="100"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 100 100)"
        />
      </Svg>

      {/* Center label */}
      <View style={styles.labelContainer}>
        <Text style={[styles.percentText, { color }]}>
          {value === null ? "--" : formatPercent(pct, 0)}
        </Text>
        <Text style={styles.aiLabel}>AI PROBABILITY</Text>
        <Text style={[styles.riskLabel, { color }]}>
          {value === null ? "AWAITING FIRST WINDOW" : riskLabel(pct)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  pulseRing: {
    position: "absolute",
    inset: 16,
    top: 16,
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 9999,
    borderWidth: 1,
  },
  glow: {
    position: "absolute",
    top: 32,
    left: 32,
    right: 32,
    bottom: 32,
    borderRadius: 9999,
  },
  svg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  labelContainer: {
    alignItems: "center",
    zIndex: 1,
  },
  percentText: {
    fontFamily: "JetBrainsMono_600SemiBold",
    fontSize: 36,
    lineHeight: 40,
  },
  aiLabel: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 9,
    letterSpacing: 2,
    color: Colors.mutedForeground,
    marginTop: 4,
    textTransform: "uppercase",
  },
  riskLabel: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
    marginTop: 8,
    letterSpacing: 0.5,
  },
});
