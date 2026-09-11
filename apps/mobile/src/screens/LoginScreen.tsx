import { useState } from "react";
import { View } from "react-native";
import { sendMagicLink } from "../api";
import { Banner, Body, Button, ErrorText, FieldLabel, Input, Kicker, Muted, Screen, Title } from "../ui";

export function LoginScreen({
  onSignedIn,
  fallback,
}: {
  onSignedIn: (token: string) => void;
  fallback?: boolean;
}) {
  const [email, setEmail] = useState("member@ajax.local");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appleNote, setAppleNote] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const result = await sendMagicLink(email);
      if (result.session?.accessToken) {
        onSignedIn(result.session.accessToken);
        return;
      }
      setError(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      footer={
        <>
          <Button label={busy ? "Sending…" : "Email me a magic link"} onPress={submit} disabled={busy} />
          <Button
            label="Continue with Apple"
            variant="ghost"
            onPress={() => setAppleNote("Apple Sign-In is stubbed for a later milestone.")}
          />
        </>
      }
    >
      <Kicker>Ajax Fitness · Aspen</Kicker>
      <Title>Train with a plan that knows you.</Title>
      <Body>
        Members only. Use the email on the Ajax roster. If we do not have live auth credentials, this build signs you
        in locally so you can walk the onboarding.
      </Body>
      {fallback ? <Banner>Running without live Supabase / Expo credentials (local mock).</Banner> : null}
      <FieldLabel>Email</FieldLabel>
      <Input
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder="you@ajaxgym.com"
      />
      <ErrorText>{error}</ErrorText>
      <ErrorText>{appleNote}</ErrorText>
      <Banner>
        Manual roster for M0 (no Wellyx): david@ajaxgym.com, seth@ajaxgym.com, member@ajax.local
      </Banner>
      <View>
        <Muted>Health data and SMS consent are not part of this step. Those come later.</Muted>
      </View>
    </Screen>
  );
}
