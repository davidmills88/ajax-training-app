import { useMemo, useState } from "react";
import { View } from "react-native";
import {
  recapSection,
  sectionById,
  type OnboardingAnswers,
  type OnboardingSectionId,
} from "@ajax/shared";
import { confirmSection, saveSection } from "../api";
import { Body, Button, Chip, ErrorText, FieldLabel, Input, Kicker, Muted, Screen, Title } from "../ui";

export function SectionScreen({
  token,
  sectionId,
  initial,
  onConfirmed,
}: {
  token: string;
  sectionId: OnboardingSectionId;
  initial?: OnboardingAnswers;
  onConfirmed: () => void;
}) {
  const section = useMemo(() => sectionById(sectionId), [sectionId]);
  const [answers, setAnswers] = useState<OnboardingAnswers>(initial ?? {});
  const [phase, setPhase] = useState<"edit" | "confirm">("edit");
  const [recap, setRecap] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function setValue(key: string, value: string | number | string[]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function toggleMulti(key: string, value: string) {
    const current = Array.isArray(answers[key]) ? (answers[key] as string[]) : [];
    setValue(key, current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  async function goConfirm() {
    setBusy(true);
    setError(null);
    try {
      const saved = await saveSection(token, sectionId, answers);
      setRecap(saved.recap.length ? saved.recap : recapSection(sectionId, answers));
      setPhase("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please complete the required fields.");
    } finally {
      setBusy(false);
    }
  }

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      await confirmSection(token, sectionId);
      onConfirmed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm this section.");
    } finally {
      setBusy(false);
    }
  }

  if (phase === "confirm") {
    return (
      <Screen
        footer={
          <>
            <Button label={busy ? "Saving…" : "This is accurate"} onPress={accept} disabled={busy} />
            <Button label="Edit this section" variant="ghost" onPress={() => setPhase("edit")} />
          </>
        }
      >
        <Kicker>
          Section {section.id} of 9 · Confirm
        </Kicker>
        <Title>{section.title}</Title>
        <Body>Here is what we heard. Confirm it before we go on.</Body>
        {recap.map((line) => (
          <Muted key={line}>{line}</Muted>
        ))}
        <ErrorText>{error}</ErrorText>
      </Screen>
    );
  }

  return (
    <Screen footer={<Button label={busy ? "Checking…" : "Review this section"} onPress={goConfirm} disabled={busy} />}>
      <Kicker>Section {section.id} of 9</Kicker>
      <Title>{section.title}</Title>
      <Body>{section.blurb}</Body>
      {section.fields.map((field) => (
        <View key={field.key}>
          <FieldLabel>
            {field.prompt}
            {field.required ? " *" : ""}
          </FieldLabel>
          {field.type === "select" ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {field.options?.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={answers[field.key] === option.value}
                  onPress={() => setValue(field.key, option.value)}
                />
              ))}
            </View>
          ) : null}
          {field.type === "multiselect" ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {field.options?.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={Array.isArray(answers[field.key]) && (answers[field.key] as string[]).includes(option.value)}
                  onPress={() => toggleMulti(field.key, option.value)}
                />
              ))}
            </View>
          ) : null}
          {field.type === "scale" ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <Chip
                  key={n}
                  label={String(n)}
                  selected={Number(answers[field.key]) === n}
                  onPress={() => setValue(field.key, n)}
                />
              ))}
            </View>
          ) : null}
          {field.type === "text" || field.type === "textarea" || field.type === "number" ? (
            <Input
              keyboardType={field.type === "number" ? "number-pad" : "default"}
              multiline={field.type === "textarea"}
              value={answers[field.key] === undefined ? "" : String(answers[field.key])}
              onChangeText={(text) => setValue(field.key, field.type === "number" ? Number(text) || text : text)}
            />
          ) : null}
        </View>
      ))}
      <ErrorText>{error}</ErrorText>
    </Screen>
  );
}
