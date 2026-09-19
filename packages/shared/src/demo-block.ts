import {
  buildFoundationWorkouts,
  foundationWeekNotes,
  FOUNDATION_DURATION_WEEKS,
} from "./foundation-block.js";
import type { CreateBlockInput } from "./training.js";

export const DEMO_MEMBER_EMAIL = "member@ajax.local";

export const DEMO_BLOCK_NOTES =
  "A first custom block: three sessions a week, strength plus easy aerobic work. Load only when the movement stays quiet and controlled. Every exercise has an in-app form video.";

export const DAY8_FOUNDATION_NOTES =
  "First custom Day-8 block: three sessions a week (days 1 / 3 / 5), strength plus easy aerobic work. Load only when the movement stays quiet and controlled. Every exercise has an in-app form video (public YouTube placeholders until Ajax uploads clips).";

const HAPPY_FLAGS = { knee: false, shoulder: false, back: false } as const;

function foundationFixture(title: string, notes: string): CreateBlockInput {
  return {
    title,
    notes,
    durationWeeks: FOUNDATION_DURATION_WEEKS,
    workouts: buildFoundationWorkouts({
      flags: { ...HAPPY_FLAGS },
      equipment: "ajax",
      band: "default",
      videos: {},
      notesFor: (slot, week) => foundationWeekNotes(slot, week),
    }),
  };
}

/** Seeded 6-week Ajax block assigned to member@ajax.local in mock + SQL seed. */
export const DEMO_BLOCK: CreateBlockInput = foundationFixture("Ajax Foundation — 6 weeks", DEMO_BLOCK_NOTES);

/** POST /coach/blocks body for `npm run assign:day8`. Same sessions as DEMO_BLOCK. */
export const DAY8_FOUNDATION_BLOCK: CreateBlockInput = foundationFixture(
  "Day 8 Foundation — 6 weeks",
  DAY8_FOUNDATION_NOTES,
);
