import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { nextUnconfirmed, type MePayload, type OnboardingSectionId } from "@ajax/shared";
import { fetchMe, isMockFallback } from "./src/api";
import { ConsentScreen } from "./src/screens/ConsentScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { SectionScreen } from "./src/screens/SectionScreen";
import { SummaryScreen } from "./src/screens/SummaryScreen";
import { readSessionToken, writeSessionToken } from "./src/storage";
import { colors } from "./src/theme";

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<MePayload | null>(null);
  const [loading, setLoading] = useState(true);

  async function hydrate(nextToken: string | null) {
    setLoading(true);
    try {
      if (!nextToken) {
        setToken(null);
        setMe(null);
        writeSessionToken(null);
        return;
      }
      const payload = await fetchMe(nextToken);
      setToken(nextToken);
      setMe(payload);
      writeSessionToken(nextToken);
    } catch {
      setToken(null);
      setMe(null);
      writeSessionToken(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void hydrate(readSessionToken());
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const fallback = isMockFallback();

  if (!token || !me) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar style="light" />
        <LoginScreen
          fallback={fallback}
          onSignedIn={(next) => void hydrate(next)}
        />
      </View>
    );
  }

  if (me.next === "consent") {
    return (
      <>
        <StatusBar style="light" />
        <ConsentScreen token={token} onDone={() => void hydrate(token)} />
      </>
    );
  }

  if (me.next === "onboarding") {
    const sectionId = (me.onboarding ? nextUnconfirmed(me.onboarding) : 1) as OnboardingSectionId;
    return (
      <>
        <StatusBar style="light" />
        <SectionScreen
          token={token}
          sectionId={sectionId}
          initial={me.onboarding?.sections[sectionId]}
          onConfirmed={() => void hydrate(token)}
        />
      </>
    );
  }

  if (me.next === "summary" && me.onboarding?.clientSummary) {
    return (
      <>
        <StatusBar style="light" />
        <SummaryScreen token={token} initial={me.onboarding.clientSummary} onDone={() => void hydrate(token)} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <HomeScreen me={me} onSignOut={() => void hydrate(null)} />
    </>
  );
}
