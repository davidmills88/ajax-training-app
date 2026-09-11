import { useState } from "react";
import { CLIENT_SUMMARY_FIELDS, type ClientSummary } from "@ajax/shared";
import { completeOnboarding, saveSummary } from "../api";
import { Body, Button, ErrorText, FieldLabel, Input, Kicker, Screen, Title } from "../ui";

export function SummaryScreen({
  token,
  initial,
  onDone,
}: {
  token: string;
  initial: ClientSummary;
  onDone: () => void;
}) {
  const [summary, setSummary] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      await saveSummary(token, summary);
      await completeOnboarding(token);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the client summary.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen footer={<Button label={busy ? "Saving…" : "Looks right — finish onboarding"} onPress={finish} disabled={busy} />}>
      <Kicker>Client summary</Kicker>
      <Title>Your brief, in one place.</Title>
      <Body>
        This is the format the programming engine will read later. You can edit it now. After you finish, M0 stops here
        — the first automated block is not in this build.
      </Body>
      {CLIENT_SUMMARY_FIELDS.map((field) => (
        <FieldBlock
          key={field.key}
          label={field.label}
          value={summary[field.key]}
          onChange={(value) => setSummary((prev) => ({ ...prev, [field.key]: value }))}
        />
      ))}
      <ErrorText>{error}</ErrorText>
    </Screen>
  );
}

function FieldBlock({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <>
      <FieldLabel>{label}</FieldLabel>
      <Input multiline value={value} onChangeText={onChange} />
    </>
  );
}
