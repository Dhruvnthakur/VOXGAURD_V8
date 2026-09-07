import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Panel } from "@/components/Panel";
import {
  formatPercent,
  formatTime,
  loadSession,
  overallRisk,
  riskColor,
  riskLabel,
  riskLevel,
  type LiveWindow,
} from "@/lib/voxguard";
import { Colors, Radius, Typography } from "@/lib/theme";

/* ---------------------------------------------------------------- helpers */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.labelMono}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

/* ---------------------------------------------------------- window card */

function WindowCard({ w }: { w: LiveWindow }) {
  const [open, setOpen] = useState(false);
  const color = riskColor(riskLevel(w.aiProbability));
  const f0 = w.result.f0;

  return (
    <Panel style={styles.windowCard}>
      <TouchableOpacity
        onPress={() => setOpen((o) => !o)}
        style={styles.windowRow}
        activeOpacity={0.7}
      >
        <Text style={styles.windowTime}>
          {formatTime(w.start)}–{formatTime(w.end)}
        </Text>
        <Text style={[styles.windowRiskLabel, { color }]}>
          {riskLabel(w.aiProbability)}
        </Text>
        <Text style={[styles.windowPct, { color }]}>
          {formatPercent(w.aiProbability, 0)}
        </Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.windowDetail}>
          <View style={styles.statsGrid}>
            <Stat label="Prediction" value={w.result.prediction.toUpperCase()} />
            <Stat label="Confidence" value={formatPercent(w.result.confidence, 1)} />
            {f0 && <Stat label="F0 mean" value={`${f0.mean.toFixed(1)} Hz`} />}
            {f0 && <Stat label="F0 std" value={`${f0.std.toFixed(1)} Hz`} />}
            {f0 && (
              <Stat
                label="F0 range"
                value={`${f0.min.toFixed(0)}–${f0.max.toFixed(0)} Hz`}
              />
            )}
            {f0?.voiced_percent !== undefined && (
              <Stat label="Voiced" value={`${f0.voiced_percent.toFixed(0)}%`} />
            )}
            {w.result.audio && (
              <Stat
                label="Sample rate"
                value={`${w.result.audio.sample_rate} Hz`}
              />
            )}
          </View>
        </View>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------ screen */

export default function ForensicsScreen() {
  const [windows, setWindows] = useState<LiveWindow[]>([]);

  useEffect(() => {
    loadSession().then((s) => setWindows(s?.windows ?? []));
  }, []);

  const overall = overallRisk(windows.map((w) => w.aiProbability));

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Forensic analysis</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>

        {/* Overall risk panel */}
        <Panel style={styles.overallPanel}>
          <Text style={styles.labelMono}>Session risk</Text>
          <Text
            style={[
              styles.overallValue,
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
          <Text style={styles.overallSub}>
            {windows.length} analyzed window{windows.length === 1 ? "" : "s"} ·
            weighted 70% sustained, 30% peak
          </Text>
        </Panel>

        {/* Window list */}
        <View style={styles.windowsList}>
          {windows.length === 0 ? (
            <Panel style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No analyzed windows yet. Start a protected call to collect forensic data.
              </Text>
            </Panel>
          ) : (
            windows.map((w) => <WindowCard key={w.index} w={w} />)
          )}
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
  scroll: { flex: 1 },
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
    marginBottom: 20,
  },
  title: {
    fontFamily: Typography.displayFamily,
    fontSize: 22,
    color: Colors.foreground,
    letterSpacing: -0.4,
  },
  backButton: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonText: {
    fontFamily: Typography.sansFamily,
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  labelMono: {
    fontFamily: Typography.monoFamily,
    fontSize: 9,
    letterSpacing: 2.5,
    color: Colors.mutedForeground,
    textTransform: "uppercase",
  },
  overallPanel: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 20,
  },
  overallValue: {
    fontFamily: Typography.monoFamily,
    fontSize: 36,
    marginTop: 4,
  },
  overallSub: {
    fontFamily: Typography.sansFamily,
    fontSize: 11,
    color: Colors.mutedForeground,
    marginTop: 4,
  },
  windowsList: {
    gap: 8,
  },
  windowCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  windowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  windowTime: {
    fontFamily: Typography.monoFamily,
    fontSize: 11,
    color: Colors.mutedForeground,
    minWidth: 70,
  },
  windowRiskLabel: {
    flex: 1,
    fontFamily: Typography.sansFamilyMedium,
    fontSize: 13,
  },
  windowPct: {
    fontFamily: Typography.monoFamily,
    fontSize: 13,
  },
  windowDetail: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  stat: {
    width: "48%",
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.secondary + "66",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
  statValue: {
    fontFamily: Typography.monoFamily,
    fontSize: 13,
    color: Colors.foreground,
    marginTop: 2,
  },
  emptyCard: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: Typography.sansFamily,
    fontSize: 13,
    color: Colors.mutedForeground,
    textAlign: "center",
  },
});
