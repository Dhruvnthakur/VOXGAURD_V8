import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { RiskDial } from "@/components/RiskDial";
import { Panel } from "@/components/Panel";
import { useLiveAnalysis } from "@/lib/useLiveAnalysis";
import {
  formatPercent,
  formatTime,
  overallRisk,
  riskColor,
  riskLevel,
} from "@/lib/voxguard";
import { Colors, Radius, Typography } from "@/lib/theme";

export default function CallScreen() {
  const call = useLiveAnalysis();
  const values = call.windows.map((w) => w.aiProbability);
  const latest = values.length ? values[values.length - 1]! : null;
  const overall = overallRisk(values);

  const phaseLabel =
    call.phase === "active"
      ? "Call active"
      : call.phase === "ended"
      ? "Call ended"
      : "Ready";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>VoxGuard</Text>
            <Text style={styles.subtitle}>VOICE DEEPFAKE SHIELD</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/settings")}
            style={styles.headerButton}
            activeOpacity={0.7}
          >
            <Text style={styles.headerButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Status + Dial Panel */}
        <Panel style={styles.dialPanel}>
          <View style={styles.statusRow}>
            <Text style={styles.labelMono}>{phaseLabel}</Text>
            <Text style={styles.elapsed}>{formatTime(call.elapsed)}</Text>
          </View>

          <View style={styles.dialWrapper}>
            <RiskDial
              value={latest}
              active={call.phase === "active" && call.analyzing}
              level={call.level}
            />
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <Panel style={styles.statCard}>
              <Text style={styles.labelMono}>Windows</Text>
              <Text style={styles.statValue}>{call.windows.length}</Text>
            </Panel>
            <Panel style={styles.statCard}>
              <Text style={styles.labelMono}>Overall risk</Text>
              <Text
                style={[
                  styles.statValue,
                  {
                    color:
                      overall === null
                        ? Colors.foreground
                        : riskColor(riskLevel(overall)),
                  },
                ]}
              >
                {overall === null ? "--" : formatPercent(overall, 0)}
              </Text>
            </Panel>
          </View>

          {!call.analyzing && call.phase === "active" && (
            <Text style={styles.pausedText}>
              Analysis paused — the call continues normally.
            </Text>
          )}
          {call.error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{call.error}</Text>
            </View>
          )}
        </Panel>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {call.phase !== "active" ? (
            <TouchableOpacity
              onPress={call.startCall}
              style={styles.primaryButton}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>
                {call.phase === "ended"
                  ? "Start new protected call"
                  : "Start protected call"}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.twoButtons}>
              <TouchableOpacity
                onPress={call.analyzing ? call.pauseAnalysis : call.resumeAnalysis}
                style={styles.secondaryButton}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>
                  {call.analyzing ? "Stop analysis" : "Resume analysis"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={call.endCall}
                style={styles.destructiveButton}
                activeOpacity={0.8}
              >
                <Text style={styles.destructiveButtonText}>End call</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            onPress={() => router.push("/forensics")}
            style={styles.panelButton}
            activeOpacity={0.7}
          >
            <Text style={styles.panelButtonText}>Forensic details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/upload")}
            style={styles.uploadButton}
            activeOpacity={0.8}
          >
            <Text style={styles.uploadButtonIcon}>📂</Text>
            <Text style={styles.uploadButtonText}>Analyze a recording</Text>
          </TouchableOpacity>
        </View>

        {/* Rolling Windows */}
        <View style={styles.windowsSection}>
          <Text style={styles.labelMono}>Rolling windows</Text>
          <View style={styles.windowsList}>
            {call.windows.length === 0 ? (
              <Panel style={styles.windowItem}>
                <Text style={styles.emptyText}>
                  The first result appears after the first 5-second window is analyzed.
                </Text>
              </Panel>
            ) : (
              [...call.windows].reverse().map((w) => {
                const color = riskColor(riskLevel(w.aiProbability));
                const barWidth = `${w.aiProbability * 100}%`;
                return (
                  <Panel key={w.index} style={styles.windowItem}>
                    <Text style={styles.windowTime}>
                      {formatTime(w.start)}–{formatTime(w.end)}
                    </Text>
                    <View style={styles.windowBar}>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            { width: barWidth as any, backgroundColor: color },
                          ]}
                        />
                      </View>
                      <Text style={[styles.windowPct, { color }]}>
                        {formatPercent(w.aiProbability, 0)}
                      </Text>
                    </View>
                  </Panel>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    maxWidth: 448,
    alignSelf: "center",
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  title: {
    fontFamily: Typography.displayFamily,
    fontSize: 28,
    color: Colors.foreground,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: Typography.monoFamily,
    fontSize: 9,
    letterSpacing: 2.5,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  headerButton: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerButtonText: {
    fontFamily: Typography.sansFamilyMedium,
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  dialPanel: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  labelMono: {
    fontFamily: Typography.monoFamily,
    fontSize: 9,
    letterSpacing: 2.5,
    color: Colors.mutedForeground,
    textTransform: "uppercase",
  },
  elapsed: {
    fontFamily: Typography.monoFamily,
    fontSize: 13,
    color: Colors.mutedForeground,
  },
  dialWrapper: {
    alignItems: "center",
    marginVertical: 8,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontFamily: Typography.monoFamily,
    fontSize: 18,
    color: Colors.foreground,
    marginTop: 4,
  },
  pausedText: {
    marginTop: 12,
    textAlign: "center",
    fontFamily: Typography.sansFamily,
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  errorBox: {
    marginTop: 12,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.destructive + "66",
    backgroundColor: Colors.destructive + "1a",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorText: {
    fontFamily: Typography.sansFamily,
    fontSize: 12,
    color: Colors.destructiveForeground,
  },
  actions: {
    marginTop: 20,
    gap: 12,
  },
  primaryButton: {
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontFamily: Typography.sansFamilySemiBold,
    fontSize: 16,
    color: Colors.primaryForeground,
  },
  twoButtons: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.secondary,
    paddingVertical: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontFamily: Typography.sansFamilySemiBold,
    fontSize: 13,
    color: Colors.secondaryForeground,
  },
  destructiveButton: {
    flex: 1,
    borderRadius: Radius.full,
    backgroundColor: Colors.destructive,
    paddingVertical: 16,
    alignItems: "center",
  },
  destructiveButtonText: {
    fontFamily: Typography.sansFamilySemiBold,
    fontSize: 13,
    color: Colors.destructiveForeground,
  },
  panelButton: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    paddingVertical: 12,
    alignItems: "center",
  },
  panelButtonText: {
    fontFamily: Typography.sansFamilyMedium,
    fontSize: 14,
    color: Colors.foreground,
  },
  uploadButton: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "14",
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  uploadButtonIcon: {
    fontSize: 18,
  },
  uploadButtonText: {
    fontFamily: Typography.sansFamilySemiBold,
    fontSize: 14,
    color: Colors.primary,
  },
  windowsSection: {
    marginTop: 24,
    gap: 8,
  },
  windowsList: {
    gap: 8,
    marginTop: 8,
  },
  windowItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  windowTime: {
    fontFamily: Typography.monoFamily,
    fontSize: 11,
    color: Colors.mutedForeground,
    marginBottom: 6,
  },
  windowBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 9999,
    backgroundColor: Colors.muted,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 9999,
  },
  windowPct: {
    fontFamily: Typography.monoFamily,
    fontSize: 13,
    minWidth: 40,
    textAlign: "right",
  },
  emptyText: {
    fontFamily: Typography.sansFamily,
    fontSize: 13,
    color: Colors.mutedForeground,
    textAlign: "center",
  },
});
