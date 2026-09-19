import { youtubeEmbedUrl } from "@ajax/shared";
import { createElement, useMemo } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, space } from "./theme";

type VideoPopupProps = {
  visible: boolean;
  url?: string | null;
  title?: string;
  onClose: () => void;
};

function loadWebView(): { WebView: typeof import("react-native-webview").WebView } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native-webview") as { WebView: typeof import("react-native-webview").WebView };
  } catch {
    return null;
  }
}

function EmbeddedPlayer({ uri }: { uri: string }) {
  if (Platform.OS === "web") {
    return createElement("iframe", {
      src: uri,
      style: {
        border: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "#000",
      },
      allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen",
      allowFullScreen: true,
      title: "Movement video",
    });
  }

  const loaded = loadWebView();
  if (!loaded?.WebView) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>
          In-app player is unavailable in this build. The clip stays inside this popup — close and try another device
          or a build that includes WebView.
        </Text>
      </View>
    );
  }

  const { WebView } = loaded;
  return (
    <WebView
      source={{ uri }}
      style={styles.player}
      allowsFullscreenVideo
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      javaScriptEnabled
      domStorageEnabled
    />
  );
}

export function VideoPopup({ visible, url, title, onClose }: VideoPopupProps) {
  const embedUrl = useMemo(() => (url ? youtubeEmbedUrl(url) : null), [url]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.kicker}>Form video</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close video">
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          <View style={styles.frame}>{embedUrl ? <EmbeddedPlayer uri={embedUrl} /> : <Text style={styles.fallbackText}>No video for this movement.</Text>}</View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    padding: space.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: space.sm,
    maxWidth: 640,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kicker: {
    color: colors.accent,
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  close: { color: colors.text, fontSize: 16, fontWeight: "700" },
  title: { color: colors.text, fontSize: 18, fontWeight: "600" },
  frame: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#000",
    borderRadius: 12,
    overflow: "hidden",
  },
  player: { flex: 1, backgroundColor: "#000" },
  fallback: { flex: 1, justifyContent: "center", padding: space.md },
  fallbackText: { color: colors.muted, fontSize: 14, lineHeight: 20 },
});
