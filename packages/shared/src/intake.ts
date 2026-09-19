import { emptyClientSummary } from "./onboarding.js";
import { DEMO_BLOCK, validateCreateBlock, type CreateBlockInput, type CreateWorkoutInput } from "./training.js";
import type { ClientSummary } from "./types.js";

/** Optional video URLs Dave / Pace can attach to the 3×/week skeleton slots. */
export type IntakeVideos = {
  lower?: string | null;
  upper?: string | null;
  aerobic?: string | null;
  /** Used when a slot-specific URL is omitted. */
  default?: string | null;
};

/**
 * Minimal intake Dave (or onboarding) can hand to Pace.
 *
 * Client Summary keys match `buildClientSummary` / the member-editable summary.
 * Extra fields (`email`, `title`, `notes`, `videos`) are assign-handoff only.
 */
export type DaveIntake = Partial<ClientSummary> & {
  /** Roster email. The assign script `--email` wins when both are set. */
  email?: string;
  memberEmail?: string;
  /** Override for `POST /coach/blocks` title. Default: `{name} — 6 weeks`. */
  title?: string;
  /** Extra coach notes appended after the compiled Client Summary. */
  notes?: string;
  /** Nested Client Summary (Dave may wrap the onboarding export). */
  clientSummary?: Partial<ClientSummary>;
  client_summary?: Partial<ClientSummary>;
  videos?: IntakeVideos;
  /** Alias for `videos.default`. */
  videoUrl?: string | null;
};

export type IntakeSlot = "lower" | "upper" | "aerobic";

const SUMMARY_KEYS: (keyof ClientSummary)[] = [
  "name",
  "ageGender",
  "goals",
  "trainingAvailability",
  "equipmentAccess",
  "limitationsInjuries",
  "strengthsWeaknesses",
  "recoveryNutritionNotes",
  "coachingPreferences",
];

function asTrimmed(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function optionalUrl(value: unknown): string | null {
  const raw = asTrimmed(value);
  return raw.length ? raw : null;
}

export function resolveIntakeSummary(intake: DaveIntake): ClientSummary {
  const nested = intake.clientSummary ?? intake.client_summary ?? {};
  const summary = emptyClientSummary();
  for (const key of SUMMARY_KEYS) {
    summary[key] = asTrimmed(intake[key]) || asTrimmed(nested[key]);
  }
  return summary;
}

export function resolveIntakeEmail(intake: DaveIntake): string {
  return asTrimmed(intake.email) || asTrimmed(intake.memberEmail);
}

export function resolveIntakeVideos(intake: DaveIntake): IntakeVideos {
  const videos = intake.videos ?? {};
  return {
    lower: optionalUrl(videos.lower),
    upper: optionalUrl(videos.upper),
    aerobic: optionalUrl(videos.aerobic),
    default: optionalUrl(videos.default) ?? optionalUrl(intake.videoUrl),
  };
}

export function slotForWorkout(workout: Pick<CreateWorkoutInput, "day" | "title">): IntakeSlot {
  if (workout.day === 1) return "lower";
  if (workout.day === 3) return "upper";
  if (workout.day === 5) return "aerobic";
  const title = workout.title.toLowerCase();
  if (title.includes("lower") || title.includes("squat") || title.includes("hinge")) return "lower";
  if (title.includes("upper") || title.includes("press") || title.includes("pull")) return "upper";
  return "aerobic";
}

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

export function validateIntake(intake: DaveIntake): string[] {
  const errors: string[] = [];
  if (!intake || typeof intake !== "object" || Array.isArray(intake)) {
    return ["Intake must be a JSON object."];
  }
  const summary = resolveIntakeSummary(intake);
  if (!asTrimmed(intake.title) && !summary.name && !summary.goals) {
    errors.push("Provide a title, name, or goals so the block can be labeled.");
  }
  const videos = resolveIntakeVideos(intake);
  for (const [key, url] of Object.entries(videos)) {
    if (!url) continue;
    if (!/^https?:\/\//i.test(url)) {
      errors.push(`videos.${key} must be an http(s) URL.`);
    }
  }
  return errors;
}

/**
 * Map Dave / Client Summary intake to a `POST /coach/blocks` body.
 * Always 6 weeks × 3 sessions (days 1 / 3 / 5) using the Foundation skeleton.
 */
export function blockFromIntake(intake: DaveIntake): CreateBlockInput {
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
