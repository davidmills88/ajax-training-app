import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { WorkoutDetail, WorkoutSegment } from "@ajax/shared";
import { fetchWorkout, logWorkoutResult } from "../api";
import { colors, space } from "../theme";
import { Banner, Body, Button, ErrorText, FieldLabel, Input, Kicker, Muted, Screen, Title } from "../ui";
import { VideoPopup } from "../VideoPopup";

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
  const [popup, setPopup] = useState<{ url: string; title: string } | null>(null);

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
  const sessionVideo = workout?.videoUrl;

  function openVideo(url: string, title: string) {
    setPopup({ url, title });
  }

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
      {sessionVideo ? (
        <Button label="Watch the session" variant="ghost" onPress={() => openVideo(sessionVideo, workout?.title ?? "Session")} />
      ) : (
        <Banner>No session-level clip. Open a Video control on any exercise below.</Banner>
      )}
      {workout?.segments?.length ? (
        <View style={styles.work}>
          <Kicker>Work</Kicker>
          {workout.segments.map((segment, index) => (
            <SegmentRow
              key={`${segment.name}-${segment.prescription ?? ""}-${index}`}
              segment={segment}
              onVideo={openVideo}
            />
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
      <VideoPopup
        visible={Boolean(popup)}
        url={popup?.url}
        title={popup?.title}
        onClose={() => setPopup(null)}
      />
    </Screen>
  );
}

function SegmentRow({
  segment,
  onVideo,
}: {
  segment: WorkoutSegment;
  onVideo: (url: string, title: string) => void;
}) {
  const videoUrl = segment.videoUrl?.trim();
  return (
    <View style={styles.segment}>
      <View style={styles.segmentCopy}>
        <Text style={styles.segmentName}>{segment.name}</Text>
        <Text style={styles.segmentMeta}>
          {segment.prescription ?? ""}
          {segment.prescription && segment.notes ? ". " : ""}
          {segment.notes ?? ""}
        </Text>
      </View>
      {videoUrl ? (
        <Pressable
          onPress={() => onVideo(videoUrl, segment.name)}
          accessibilityRole="button"
          accessibilityLabel={`Video for ${segment.name}`}
          style={styles.videoChip}
        >
          <Text style={styles.videoChipLabel}>Video</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  work: { gap: space.sm },
  segment: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  segmentCopy: { flex: 1 },
  segmentName: { color: colors.text, fontSize: 16, fontWeight: "600" },
  segmentMeta: { color: colors.muted, fontSize: 13, marginTop: 4, lineHeight: 18 },
  videoChip: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  videoChipLabel: { color: colors.accent, fontSize: 13, fontWeight: "700" },
});
