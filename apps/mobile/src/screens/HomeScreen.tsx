import { useCallback, useEffect, useState } from "react";
import type { MePayload, TrainingHome, WorkoutWithLog } from "@ajax/shared";
import { fetchTraining } from "../api";
import { Banner, Body, Button, ErrorText, Kicker, ListRow, Muted, Screen, Title } from "../ui";
import { WorkoutScreen } from "./WorkoutScreen";

const WEEKDAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function HomeScreen({
  token,
  me,
  onSignOut,
}: {
  token: string;
  me: MePayload;
  onSignOut: () => void;
}) {
  const [training, setTraining] = useState<TrainingHome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const name = me.onboarding?.clientSummary?.name || me.user.fullName;

  const load = useCallback(async () => {
    try {
      setTraining(await fetchTraining(token));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your block.");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (selectedId) {
    return <WorkoutScreen token={token} workoutId={selectedId} onBack={() => setSelectedId(null)} onSaved={load} />;
  }

  const weeks = groupByWeek(training?.workouts ?? []);

  return (
    <Screen footer={<Button label="Sign out" variant="ghost" onPress={onSignOut} />}>
      <Kicker>Ajax Training · M1</Kicker>
      <Title>Your block, {name}.</Title>
      {training?.program ? (
        <Body>
          {training.program.title}. {training.program.notes || "Three sessions a week. Open a day, watch the clip if there is one, then log what you did."}
        </Body>
      ) : (
        <Body>
          Onboarding is complete. A coach has not assigned a block yet. When they do, your week will land here.
        </Body>
      )}
      {error ? <ErrorText>{error}</ErrorText> : null}
      {weeks.map(([week, rows]) => (
        <WeekGroup key={week} week={week} workouts={rows} onOpen={setSelectedId} />
      ))}
      {training?.program ? (
        <Muted>
          {completedCount(training.workouts)} of {training.workouts.length} sessions logged.
        </Muted>
      ) : (
        <Banner>Dave or Pace can assign a 6-week block through the documented coach API.</Banner>
      )}
      <Muted>Signed in as {me.user.email}</Muted>
    </Screen>
  );
}

function WeekGroup({
  week,
  workouts,
  onOpen,
}: {
  week: number;
  workouts: WorkoutWithLog[];
  onOpen: (id: string) => void;
}) {
  return (
    <>
      <Kicker>Week {week}</Kicker>
      {workouts.map((workout) => (
        <ListRow
          key={workout.id}
          title={workout.title}
          meta={`${WEEKDAYS[workout.day] ?? `Day ${workout.day}`}${workout.videoUrl ? " · video" : ""}${
            workout.log?.completedAt ? " · completed" : ""
          }`}
          done={Boolean(workout.log?.completedAt)}
          onPress={() => onOpen(workout.id)}
        />
      ))}
    </>
  );
}

function groupByWeek(workouts: WorkoutWithLog[]): [number, WorkoutWithLog[]][] {
  const map = new Map<number, WorkoutWithLog[]>();
  for (const workout of workouts) {
    const list = map.get(workout.week) ?? [];
    list.push(workout);
    map.set(workout.week, list);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}

function completedCount(workouts: WorkoutWithLog[]): number {
  return workouts.filter((row) => row.log?.completedAt).length;
}
