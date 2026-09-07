import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Panel } from "@/components/Panel";
import { DEFAULT_API_URL, getApiUrl, setApiUrl } from "@/lib/voxguard";
import { Colors, Radius, Typography } from "@/lib/theme";

export default function SettingsScreen() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    getApiUrl().then(setUrl);
  }, []);

  const save = async () => {
    await setApiUrl(url);
    setStatus("Saved.");
  };

  const test = async () => {
    setChecking(true);
    setStatus(null);
    await setApiUrl(url);
    try {
      const base = url.trim().replace(/\/+$/, "") || DEFAULT_API_URL;
      const res = await fetch(`${base}/api/health`);
      setStatus(
        res.ok
          ? "Backend reachable."
          : `Backend responded with HTTP ${res.status}.`
      );
    } catch {
      setStatus("Could not reach the backend from this device.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </View>

          {/* Backend URL panel */}
          <Panel style={styles.section}>
            <Text style={styles.labelMono}>Analysis backend URL</Text>
            <TextInput
              value={url}
              onChangeText={setUrl}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              placeholder={DEFAULT_API_URL}
              placeholderTextColor={Colors.mutedForeground}
              style={styles.input}
            />
            <Text style={styles.hint}>
              Your FastAPI server. Chunks are posted to{" "}
              <Text style={styles.mono}>/api/analyze-chunk</Text>. On a phone use
              your computer's LAN address (e.g. http://192.168.1.20:8000).
            </Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={save}
                style={styles.primaryButton}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={test}
                disabled={checking}
                style={[styles.secondaryButton, checking && styles.disabled]}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>
                  {checking ? "Testing…" : "Test connection"}
                </Text>
              </TouchableOpacity>
            </View>

            {status && <Text style={styles.statusText}>{status}</Text>}
          </Panel>

          {/* Install info */}
          <Panel style={styles.section}>
            <Text style={[styles.labelMono, { marginBottom: 8 }]}>About</Text>
            <Text style={styles.infoText}>
              VoxGuard monitors live call audio in 5-second windows and sends each window
              to your analysis backend for AI voice deepfake detection. Results appear in
              real time on the main screen.
            </Text>
          </Panel>
        </ScrollView>
      </KeyboardAvoidingView>
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
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
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
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 8,
  },
  labelMono: {
    fontFamily: Typography.monoFamily,
    fontSize: 9,
    letterSpacing: 2.5,
    color: Colors.mutedForeground,
    textTransform: "uppercase",
  },
  input: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.input,
    backgroundColor: Colors.secondary + "80",
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: Typography.monoFamily,
    fontSize: 13,
    color: Colors.foreground,
    marginTop: 4,
  },
  hint: {
    fontFamily: Typography.sansFamily,
    fontSize: 11,
    color: Colors.mutedForeground,
    lineHeight: 16,
  },
  mono: {
    fontFamily: Typography.monoFamily,
    fontSize: 11,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  primaryButton: {
    flex: 1,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    fontFamily: Typography.sansFamilySemiBold,
    fontSize: 14,
    color: Colors.primaryForeground,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.secondary,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontFamily: Typography.sansFamilySemiBold,
    fontSize: 14,
    color: Colors.secondaryForeground,
  },
  disabled: {
    opacity: 0.6,
  },
  statusText: {
    fontFamily: Typography.sansFamily,
    fontSize: 13,
    color: Colors.mutedForeground,
    marginTop: 4,
  },
  infoText: {
    fontFamily: Typography.sansFamily,
    fontSize: 12,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
});
