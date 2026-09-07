/**
 * Shared "Panel" card component — matches the web's `.panel` utility:
 * rounded border, frosted card background, subtle shadow.
 */
import React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { Colors, Radius, Shadow } from "@/lib/theme";

interface PanelProps extends ViewProps {
  children: React.ReactNode;
}

export function Panel({ children, style, ...rest }: PanelProps) {
  return (
    <View style={[styles.panel, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    ...Shadow.card,
  },
});
