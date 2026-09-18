import { useEffect, useState } from "react";
import { Linking, View } from "react-native";
import type { WorkoutDetail } from "@ajax/shared";
import { fetchWorkout, logWorkoutResult } from "../api";
import { Banner, Body, Button, ErrorText, FieldLabel, Input, Kicker, Muted, Screen, Title } from "../ui";

export function WorkoutScreen({
  token,
  workoutId,
  onBack,
  onSaved,
}: {
  token: string;
  workoutId: string;
  onBack: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [detail, setDetail] = useState<WorkoutDetail | null>(null);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [score, setScore] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetchWorkout(token, workoutId)
      .then((next) => {
        setDetail(next);
        setWeight(next.log?.weight ?? "");
        setReps(next.log?.reps ?? "");
        setScore(next.log?.score ?? "");
        setNotes(next.log?.notes ?? "");
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load this session.");
      });
  }, [token, workoutId]);

  async function save(completed: boolean) {
    setBusy(true);
    setError(null);
    try {
      const result = await logWorkoutResult(token, workoutId, {
        weight,
        reps,
        score,
        notes,
        completed,
      });
      setDetail(result.workout);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this result.");
    } finally {
      setBusy(false);
    }
  }

  const workout = detail?.workout;
  const videoUrl = workout?.videoUrl;

  return (
    <Screen
      footer={
        <>
          <Button
            label={busy ? "Saving…" : detail?.log?.completedAt ? "Update result" : "Save and mark complete"}
            onPress={() => void save(true)}
            disabled={busy || !workout}
          />
          <Button label="Back to the block" variant="ghost" onPress={onBack} />
        </>
      }
    >
      <Kicker>
        {detail ? `Week ${detail.workout.week} · Day ${detail.workout.day}` : "Session"}
      </Kicker>
      <Title>{workout?.title ?? "Loading…"}</Title>
      {workout?.notes ? <Body>{workout.notes}</Body> : null}
      {videoUrl ? (
        <Button
          label="Watch the movement"
          variant="ghost"
          onPress={() => {
            void Linking.openURL(videoUrl).catch(() => setError("Could not open the video link."));
          }}
        />
      ) : (
        <Banner>No video on this session. Use the notes and segments below.</Banner>
      )}
      {workout?.segments?.length ? (
        <View>
          <Kicker>Work</Kicker>
          {workout.segments.map((segment) => (
            <Muted key={`${segment.name}-${segment.prescription ?? ""}`}>
              {segment.name}
              {segment.prescription ? ` — ${segment.prescription}` : ""}
              {segment.notes ? `. ${segment.notes}` : ""}
            </Muted>
          ))}
        </View>
      ) : null}
      <Kicker>Result</Kicker>
      <FieldLabel>Weight</FieldLabel>
      <Input value={weight} onChangeText={setWeight} placeholder="e.g. 32 kg or 70 lb" />
      <FieldLabel>Reps</FieldLabel>
      <Input value={reps} onChangeText={setReps} placeholder="e.g. 8, 8, 8" />
      <FieldLabel>Score</FieldLabel>
      <Input value={score} onChangeText={setScore} placeholder="e.g. 7/10 or RPE 7" />
      <FieldLabel>Notes</FieldLabel>
      <Input
        multiline
        value={notes}
        onChangeText={setNotes}
        placeholder="What felt quiet? What needs a lighter day?"
      />
      {detail?.log?.completedAt ? (
        <Muted>Last completed {new Date(detail.log.completedAt).toLocaleString()}.</Muted>
      ) : (
        <Muted>Save when you finish. You can update the numbers later.</Muted>
      )}
      <ErrorText>{error}</ErrorText>
    </Screen>
  );
}
