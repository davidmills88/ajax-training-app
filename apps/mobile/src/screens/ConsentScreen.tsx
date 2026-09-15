import { useState } from "react";
import { CONSENT_COPY, emptyConsentQuestionnaire, submitConsent } from "../api";
import type { ConsentQuestionnaire } from "@ajax/shared";
import { Banner, Body, Button, Chip, ErrorText, FieldLabel, Input, Kicker, Screen, Title } from "../ui";

export function ConsentScreen({ token, onDone }: { token: string; onDone: () => void }) {
  const [q, setQ] = useState<ConsentQuestionnaire>(emptyConsentQuestionnaire());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggle(key: keyof ConsentQuestionnaire) {
    setQ((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await submitConsent(token, q);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please complete the required confirmations.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen footer={<Button label={busy ? "Saving…" : "Agree and continue"} onPress={submit} disabled={busy} />}>
      <Kicker>Account</Kicker>
      <Title>{CONSENT_COPY.title}</Title>
      <Body>{CONSENT_COPY.intro}</Body>
      <Banner>{CONSENT_COPY.terms}</Banner>
      <FieldLabel>Required confirmations</FieldLabel>
      <Chip label="I am 18 or older" selected={q.isAdult} onPress={() => toggle("isAdult")} />
      <Chip
        label="I understand Ajax stores this training profile"
        selected={q.understandProfileStorage}
        onPress={() => toggle("understandProfileStorage")}
      />
      <Chip label="I accept the account terms" selected={q.acceptTerms} onPress={() => toggle("acceptTerms")} />
      <Chip
        label="I understand health and SMS consent come later"
        selected={q.understandLaterConsents}
        onPress={() => toggle("understandLaterConsents")}
      />
      <FieldLabel>How did you hear about the app? (optional)</FieldLabel>
      <Input value={q.hearAboutUs} onChangeText={(hearAboutUs) => setQ((p) => ({ ...p, hearAboutUs }))} />
      <FieldLabel>Anything we should know about privacy? (optional)</FieldLabel>
      <Input multiline value={q.notes} onChangeText={(notes) => setQ((p) => ({ ...p, notes }))} />
      <Body>{CONSENT_COPY.laterNote}</Body>
      <ErrorText>{error}</ErrorText>
    </Screen>
  );
}
