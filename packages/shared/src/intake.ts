import { generateFoundationBlock } from "./foundation-block.js";
import {
  asTrimmed,
  optionalUrl,
  resolveIntakeSummary,
  resolveIntakeVideos,
  slotForWorkout,
  validateIntake,
  type DaveIntake,
  type IntakeSlot,
  type IntakeVideos,
} from "./intake-core.js";
import { DEMO_BLOCK, validateCreateBlock, type CreateBlockInput, type CreateWorkoutInput } from "./training.js";
import type { ClientSummary } from "./types.js";

export type { DaveIntake, IntakeSlot, IntakeVideos } from "./intake-core.js";
export {
  resolveIntakeEmail,
  resolveIntakeSummary,
  resolveIntakeVideos,
  slotForWorkout,
  validateIntake,
} from "./intake-core.js";

export type BlockFromIntakeOptions = {
  /** M1.2 overlay of the Foundation DEMO_BLOCK. Default is the M2 generator. */
  skeleton?: boolean;
};

function videoForSlot(slot: IntakeSlot, videos: IntakeVideos): string | null {
  return optionalUrl(videos[slot]) ?? optionalUrl(videos.default);
}

function defaultTitle(summary: ClientSummary): string {
  if (summary.name) return `${summary.name} — 6 weeks`;
  const goal = summary.goals.split(/[·.—]/)[0]?.trim();
  if (goal) return `${goal} — 6 weeks`;
  return "Dave intake — 6 weeks";
}

function compileBlockNotes(intake: DaveIntake, summary: ClientSummary): string {
  const lines: string[] = [
    "Skeleton 6-week block (3×/week, days 1 / 3 / 5). Not an auto-programmed engine — Dave / a coach should swap sessions before the member trains if this is only a first pass.",
  ];
  const pairs: [string, string][] = [
    ["Name", summary.name],
    ["Age / gender", summary.ageGender],
    ["Goals", summary.goals],
    ["Availability", summary.trainingAvailability],
    ["Equipment", summary.equipmentAccess],
    ["Limitations", summary.limitationsInjuries],
    ["Strengths / weak links", summary.strengthsWeaknesses],
    ["Recovery / nutrition", summary.recoveryNutritionNotes],
    ["Coaching prefs", summary.coachingPreferences],
  ];
  for (const [label, value] of pairs) {
    if (value) lines.push(`${label}: ${value}`);
  }
  const extra = asTrimmed(intake.notes);
  if (extra) lines.push(extra);
  return lines.join("\n");
}

function overlayWorkoutNotes(workout: CreateWorkoutInput, summary: ClientSummary): string {
  const slot = slotForWorkout(workout);
  const extras: string[] = [];
  if (summary.goals) extras.push(`Goal thread: ${summary.goals}`);
  if (slot === "lower" && summary.limitationsInjuries) {
    extras.push(`Watch: ${summary.limitationsInjuries}`);
  }
  if (slot === "upper" && summary.strengthsWeaknesses) {
    extras.push(`Build from: ${summary.strengthsWeaknesses}`);
  }
  if (slot === "aerobic" && summary.recoveryNutritionNotes) {
    extras.push(`Recovery context: ${summary.recoveryNutritionNotes}`);
  }
  if (summary.trainingAvailability) extras.push(`Availability: ${summary.trainingAvailability}`);
  const base = asTrimmed(workout.notes);
  return [base, ...extras].filter(Boolean).join(" ");
}

/**
 * Map Dave / Client Summary intake to a `POST /coach/blocks` body.
 * Default: M2 first-pass generator (6 weeks × days 1 / 3 / 5, limitation swaps).
 * Pass `{ skeleton: true }` for the M1.2 DEMO_BLOCK overlay.
 */
export function blockFromIntake(intake: DaveIntake, options?: BlockFromIntakeOptions): CreateBlockInput {
  if (options?.skeleton) {
    return blockFromIntakeSkeleton(intake);
  }
  return generateFoundationBlock(intake);
}

/** M1.2 overlay: Foundation DEMO_BLOCK plus Client Summary notes. Used by `--skeleton`. */
export function blockFromIntakeSkeleton(intake: DaveIntake): CreateBlockInput {
  const errors = validateIntake(intake);
  if (errors.length) {
    throw new Error(errors.join(" "));
  }
  const summary = resolveIntakeSummary(intake);
  const videos = resolveIntakeVideos(intake);
  const block: CreateBlockInput = {
    title: asTrimmed(intake.title) || defaultTitle(summary),
    notes: compileBlockNotes(intake, summary),
    durationWeeks: 6,
    workouts: DEMO_BLOCK.workouts.map((workout, index) => {
      const slot = slotForWorkout(workout);
      const videoUrl = videoForSlot(slot, videos) ?? optionalUrl(workout.videoUrl);
      return {
        week: workout.week,
        day: workout.day,
        sortOrder: workout.sortOrder ?? index,
        title: workout.title,
        notes: overlayWorkoutNotes(workout, summary),
        videoUrl,
        segments: (workout.segments ?? []).map((segment) => ({
          ...segment,
          videoUrl: optionalUrl(segment.videoUrl) ?? videoUrl,
        })),
      };
    }),
  };
  const blockErrors = validateCreateBlock(block);
  if (blockErrors.length) {
    throw new Error(blockErrors.join(" "));
  }
  return block;
}
