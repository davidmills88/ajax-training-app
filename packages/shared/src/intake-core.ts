import { emptyClientSummary } from "./onboarding.js";
import type { CreateWorkoutInput } from "./training.js";
import type { ClientSummary } from "./types.js";

/** Optional video URLs Dave / Pace can attach to the 3×/week slots. */
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

export function asTrimmed(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

export function optionalUrl(value: unknown): string | null {
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
