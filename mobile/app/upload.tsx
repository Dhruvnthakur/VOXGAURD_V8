/**
 * upload.tsx — Analyze a previous call recording
 *
 * Lets the user pick any audio file from their device, sends it to the
 * VoxGuard backend /api/analyze endpoint, and renders the full forensic result.
 */

import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import { Panel } from "@/components/Panel";
import {
  analyzeFullFile,
  formatPercent,
  riskColor,
  riskLabel,
  riskLevel,
  type AnalysisResult,
} from "@/lib/voxguard";
import { Colors, Radius, Typography } from "@/lib/theme";

/* ─────────────────────────────── types ────────────────────────────────── */

type Phase = "idle" | "uploading" | "done" | "error";

/* ─────────────────────────── small helpers ─────────────────────────────── */

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <View style={[styles.statCard, accent ? { borderColor: accent + "55" } : undefined]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent ? { color: accent } : undefined]}>{value}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionGrid}>{children}</View>
    </View>
  );
}

/* ─────────────────────────── result panel ──────────────────────────────── */

function ResultPanel({ result }: { result: AnalysisResult }) {
  const prob = result.probabilities.fake;
  const level = riskLevel(prob);
  const color = riskColor(level);

  return (
    <View style={styles.resultContainer}>
      {/* Verdict banner */}
      <Panel style={[styles.verdictPanel, { borderColor: color + "55" }]}>
        <View
          style={[
            styles.verdictBadge,
            { backgroundColor: color + "18", borderColor: color + "44" },
          ]}
        >
          <Text style={[styles.verdictBadgeText, { color }]}>
            {result.prediction === "fake" ? "⚠ AI VOICE DETECTED" : "✓ LIKELY HUMAN"}
          </Text>
        </View>

        <Text style={[styles.verdictPct, { color }]}>{formatPercent(prob, 1)}</Text>
        <Text style={[styles.verdictSub, { color }]}>{riskLabel(prob)}</Text>

        {/* Confidence bar */}
        <View style={styles.confRow}>
          <Text style={styles.confLabel}>Confidence</Text>
          <View style={styles.confTrack}>
            <View
              style={[
                styles.confFill,
                {
                  width: `${result.confidence * 100}%` as any,
                  backgroundColor: color,
                },
              ]}
            />
          </View>
          <Text style={[styles.confPct, { color }]}>
            {formatPercent(result.confidence, 0)}
          </Text>
        </View>
      </Panel>

      {/* File info */}
      {result.audio && (
        <Section title="FILE INFO">
          <StatCard label="Duration" value={`${result.audio.duration.toFixed(2)}s`} />
          <StatCard label="Sample rate" value={`${result.audio.sample_rate} Hz`} />
        </Section>
      )}

      {/* F0 / Pitch */}
      {result.f0 && (
        <Section title="PITCH (F0)">
          <StatCard label="Mean" value={`${result.f0.mean.toFixed(1)} Hz`} />
          <StatCard label="Std dev" value={`${result.f0.std.toFixed(1)} Hz`} />
          <StatCard
            label="Range"
            value={`${result.f0.min.toFixed(0)}–${result.f0.max.toFixed(0)} Hz`}
          />
          {result.f0.voiced_percent !== undefined && (
            <StatCard label="Voiced" value={`${result.f0.voiced_percent.toFixed(0)}%`} />
          )}
        </Section>
      )}

      {/* Prediction breakdown */}
      <Section title="PREDICTION BREAKDOWN">
        <StatCard
          label="AI probability"
          value={formatPercent(result.probabilities.fake, 2)}
          accent={color}
        />
        <StatCard
          label="Human probability"
          value={formatPercent(result.probabilities.real, 2)}
          accent={Colors.riskLow}
        />
        <StatCard
          label="Prediction"
          value={result.prediction.toUpperCase()}
          accent={color}
        />
        <StatCard label="Confidence" value={formatPercent(result.confidence, 2)} />
      </Section>

      <Text style={styles.filenameLine}>Analyzed: {result.filename}</Text>
    </View>
  );
}

/* ─────────────────────────────── screen ────────────────────────────────── */

export default function UploadScreen() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pickAndAnalyze = async () => {
    setResult(null);
    setErrorMsg(null);

    let pickerResult: DocumentPicker.DocumentPickerResult;
    try {
      pickerResult = await DocumentPicker.getDocumentAsync({
        type: [
          "audio/*",
          "audio/mpeg",
          "audio/wav",
          "audio/x-wav",
          "audio/mp4",
          "audio/m4a",
          "audio/aac",
          "audio/flac",
          "audio/ogg",
          "audio/webm",
          "application/octet-stream",
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });
    } catch {
      setErrorMsg("Could not open the file picker.");
      setPhase("error");
      return;
    }

    if (pickerResult.canceled || !pickerResult.assets?.length) return;

    const asset = pickerResult.assets[0]!;
    const uri = asset.uri;
    const name = asset.name ?? uri.split("/").pop() ?? "recording.m4a";

    // Validate extension client-side
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    const allowed = ["wav", "mp3", "flac", "ogg", "m4a", "webm", "aac"];
    if (!allowed.includes(ext)) {
      setErrorMsg(
        `Unsupported file type (.${ext}). Please pick a WAV, MP3, M4A, FLAC, OGG, or WebM file.`
      );
      setPhase("error");
      return;
    }

    setFileName(name);
    setPhase("uploading");

    try {
      const analysisResult = await analyzeFullFile(uri, name);
      setResult(analysisResult);
      setPhase("done");
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Analysis failed. Is the backend running?"
      );
      setPhase("error");
    }
  };

  const reset = () => {
    setPhase("idle");
    setFileName(null);
    setResult(null);
    setErrorMsg(null);
  };

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
            <Text style={styles.title}>Upload Recording</Text>
            <Text style={styles.subtitle}>ANALYZE A PREVIOUS CALL</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>

        {/* Idle — pick zone */}
        {phase === "idle" && (
          <TouchableOpacity
            onPress={pickAndAnalyze}
            activeOpacity={0.85}
            style={styles.dropZone}
          >
            <Text style={styles.dropIcon}>🎙</Text>
            <Text style={styles.dropTitle}>Select a call recording</Text>
            <Text style={styles.dropSub}>WAV · MP3 · M4A · FLAC · OGG · WebM</Text>
            <View style={styles.dropButton}>
              <Text style={styles.dropButtonText}>Browse files</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Uploading / analysing */}
        {phase === "uploading" && (
          <Panel style={styles.loadingPanel}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingTitle}>Analyzing…</Text>
            {fileName && (
              <Text style={styles.loadingFile} numberOfLines={1}>
                {fileName}
              </Text>
            )}
            <Text style={styles.loadingNote}>
              Running deepfake detection and acoustic analysis.
            </Text>
          </Panel>
        )}

        {/* Result */}
        {phase === "done" && result && (
          <>
            <ResultPanel result={result} />
            <TouchableOpacity
              onPress={reset}
              style={styles.analyzeAnother}
              activeOpacity={0.8}
            >
              <Text style={styles.analyzeAnotherText}>Analyze another recording</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Error */}
        {phase === "error" && (
          <Panel style={styles.errorPanel}>
            <Text style={styles.errorTitle}>Analysis failed</Text>
            <Text style={styles.errorBody}>{errorMsg}</Text>
            <TouchableOpacity onPress={reset} style={styles.retryButton} activeOpacity={0.8}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </Panel>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─────────────────────────────── styles ────────────────────────────────── */

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 48,
    maxWidth: 448,
    alignSelf: "center",
    width: "100%",
  },

  /* header */
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  title: {
    fontFamily: Typography.displayFamily,
    fontSize: 24,
    color: Colors.foreground,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: Typography.monoFamily,
    fontSize: 9,
    letterSpacing: 2.5,
    color: Colors.mutedForeground,
    marginTop: 3,
  },
  backButton: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  backButtonText: {
    fontFamily: Typography.sansFamily,
    fontSize: 12,
    color: Colors.mutedForeground,
  },

  /* drop zone */
  dropZone: {
    borderRadius: Radius["2xl"],
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: "dashed",
    backgroundColor: Colors.card,
    paddingVertical: 52,
    paddingHorizontal: 32,
    alignItems: "center",
    gap: 10,
  },
  dropIcon: { fontSize: 48, marginBottom: 4 },
  dropTitle: {
    fontFamily: Typography.displayFamilyMedium,
    fontSize: 18,
    color: Colors.foreground,
    textAlign: "center",
  },
  dropSub: {
    fontFamily: Typography.monoFamily,
    fontSize: 10,
    letterSpacing: 1.5,
    color: Colors.mutedForeground,
    textAlign: "center",
  },
  dropButton: {
    marginTop: 16,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 13,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dropButtonText: {
    fontFamily: Typography.sansFamilySemiBold,
    fontSize: 14,
    color: Colors.primaryForeground,
  },

  /* loading */
  loadingPanel: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 14,
  },
  loadingTitle: {
    fontFamily: Typography.displayFamilyMedium,
    fontSize: 20,
    color: Colors.foreground,
    marginTop: 8,
  },
  loadingFile: {
    fontFamily: Typography.monoFamily,
    fontSize: 11,
    color: Colors.mutedForeground,
    maxWidth: "90%",
    textAlign: "center",
  },
  loadingNote: {
    fontFamily: Typography.sansFamily,
    fontSize: 12,
    color: Colors.mutedForeground,
    textAlign: "center",
    lineHeight: 18,
  },

  /* result */
  resultContainer: { gap: 16 },
  verdictPanel: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
  },
  verdictBadge: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 8,
  },
  verdictBadgeText: {
    fontFamily: Typography.monoFamily,
    fontSize: 10,
    letterSpacing: 2,
  },
  verdictPct: {
    fontFamily: Typography.monoFamilySemiBold,
    fontSize: 52,
    letterSpacing: -1,
  },
  verdictSub: {
    fontFamily: Typography.monoFamily,
    fontSize: 11,
    letterSpacing: 2.5,
    marginBottom: 16,
  },
  confRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  confLabel: {
    fontFamily: Typography.monoFamily,
    fontSize: 9,
    letterSpacing: 1.5,
    color: Colors.mutedForeground,
    width: 64,
  },
  confTrack: {
    flex: 1,
    height: 6,
    borderRadius: 9999,
    backgroundColor: Colors.muted,
    overflow: "hidden",
  },
  confFill: { height: "100%", borderRadius: 9999 },
  confPct: {
    fontFamily: Typography.monoFamily,
    fontSize: 12,
    minWidth: 36,
    textAlign: "right",
  },

  /* sections */
  section: { gap: 8 },
  sectionTitle: {
    fontFamily: Typography.monoFamily,
    fontSize: 9,
    letterSpacing: 2.5,
    color: Colors.mutedForeground,
    marginBottom: 2,
  },
  sectionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statCard: {
    width: "48%",
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  statLabel: {
    fontFamily: Typography.monoFamily,
    fontSize: 9,
    letterSpacing: 1.5,
    color: Colors.mutedForeground,
    textTransform: "uppercase",
  },
  statValue: {
    fontFamily: Typography.monoFamily,
    fontSize: 14,
    color: Colors.foreground,
    marginTop: 2,
  },
  filenameLine: {
    fontFamily: Typography.monoFamily,
    fontSize: 10,
    color: Colors.mutedForeground,
    textAlign: "center",
    marginTop: 4,
  },

  /* analyze another */
  analyzeAnother: {
    marginTop: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    paddingVertical: 14,
    alignItems: "center",
  },
  analyzeAnotherText: {
    fontFamily: Typography.sansFamilySemiBold,
    fontSize: 14,
    color: Colors.foreground,
  },

  /* error */
  errorPanel: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 10,
    borderColor: Colors.destructive + "44",
    borderWidth: 1,
  },
  errorTitle: {
    fontFamily: Typography.displayFamilyMedium,
    fontSize: 18,
    color: Colors.destructive,
  },
  errorBody: {
    fontFamily: Typography.sansFamily,
    fontSize: 13,
    color: Colors.mutedForeground,
    textAlign: "center",
    lineHeight: 19,
  },
  retryButton: {
    marginTop: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  retryText: {
    fontFamily: Typography.sansFamilySemiBold,
    fontSize: 14,
    color: Colors.primaryForeground,
  },
});
