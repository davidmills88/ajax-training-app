import { AjaxStoreError } from "@ajax/shared";
import { useState } from "react";
import { View } from "react-native";
import { demoCoachKey, sendCoachSession, sendMagicLink } from "../api";
import { Banner, Body, Button, ErrorText, FieldLabel, Input, Kicker, Muted, Screen, Title } from "../ui";

const NO_SESSION_MESSAGE =
  "Check your email for the Ajax sign-in link. Expo Go cannot finish sign-in without a deep link.";
const DEMO_NOTE = "Demo: a coach can POST /auth/coach-session with X-Coach-Key (see docs/go-live.md).";

function otpFailureNote(err: unknown): string | null {
  const code = err instanceof AjaxStoreError ? String(err.code) : "";
  if (code === "otp_failed" || code === "otp_rate_limited") {
    return DEMO_NOTE;
  }
  const message = err instanceof Error ? err.message : "";
  if (/otp_failed|otp_rate_limited|rate-limit|Could not send the magic link/i.test(message)) {
    return DEMO_NOTE;
  }
  return null;
}

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
  const [hint, setHint] = useState<string | null>(null);
  const [appleNote, setAppleNote] = useState<string | null>(null);
  const coachKey = demoCoachKey();

  async function submit() {
    setBusy(true);
    setError(null);
    setHint(null);
    try {
      const result = await sendMagicLink(email);
      if (result.session?.accessToken) {
        onSignedIn(result.session.accessToken);
        return;
      }
      setError(result.message?.trim() || NO_SESSION_MESSAGE);
      if (result.error === "otp_failed" || result.error === "otp_rate_limited") {
        setHint(DEMO_NOTE);
      } else {
        setHint("Expo Go will not open the email link. For a live walkthrough, use the coach-session curl in docs/go-live.md.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setHint(otpFailureNote(err));
    } finally {
      setBusy(false);
    }
  }

  async function demoSignIn() {
    setBusy(true);
    setError(null);
    setHint(null);
    try {
      const result = await sendCoachSession(email, coachKey);
      if (result.session?.accessToken) {
        onSignedIn(result.session.accessToken);
        return;
      }
      setError(result.message?.trim() || "Coach demo sign-in did not return a session.");
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
          {coachKey ? (
            <Button
              label={busy ? "Signing in…" : "Demo sign-in (coach)"}
              variant="ghost"
              onPress={demoSignIn}
              disabled={busy}
            />
          ) : null}
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
      <ErrorText>{hint}</ErrorText>
      <ErrorText>{appleNote}</ErrorText>
      <Banner>
        Manual roster for M0 (no Wellyx): david@ajaxgym.com, seth@ajaxgym.com, member@ajax.local, playwright@ajax.local
      </Banner>
      <View>
        <Muted>Health data and SMS consent are not part of this step. Those come later.</Muted>
      </View>
    </Screen>
  );
}
