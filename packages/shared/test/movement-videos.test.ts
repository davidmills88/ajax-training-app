import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  DAY8_FOUNDATION_BLOCK,
  DEMO_BLOCK,
  generateFoundationBlock,
  isHttpVideoUrl,
  validateCreateBlock,
  youtubeEmbedUrl,
  youtubeVideoId,
  type CreateBlockInput,
  type DaveIntake,
} from "../src/index.js";

const day8Fixture = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/day-8-foundation-6-week.json"), "utf8"),
) as CreateBlockInput;

const happyIntake: DaveIntake = {
  name: "Alex",
  ageGender: "41 / man",
  goals: "Quiet strength — feel durable on the hill.",
  trainingAvailability: "3 days/week · About 60 minutes · Morning",
  equipmentAccess: "Ajax gym access",
  limitationsInjuries: "",
  strengthsWeaknesses: "Hinge is honest. Press needs coaching.",
  recoveryNutritionNotes: "Sleep: 7 hours · Stress: Moderate",
  coachingPreferences: "Longevity-focused · Structured templates · Brief summary",
};

function assertEverySegmentHasHttpVideo(block: CreateBlockInput, label: string) {
  assert.deepEqual(validateCreateBlock(block), []);
  assert.ok(block.workouts.length >= 1, `${label} has workouts`);
  let segments = 0;
  for (const workout of block.workouts) {
    const list = workout.segments ?? [];
    assert.ok(list.length >= 5, `${label} ${workout.title} should be a full session, got ${list.length}`);
    for (const segment of list) {
      segments += 1;
      assert.ok(
        isHttpVideoUrl(segment.videoUrl),
        `${label} ${workout.title} / ${segment.name} missing http(s) videoUrl`,
      );
    }
    assert.ok(isHttpVideoUrl(workout.videoUrl), `${label} ${workout.title} missing session videoUrl`);
  }
  assert.ok(segments > 18, `${label} should stamp per-exercise videos, got ${segments}`);
}

describe("youtube embed helper", () => {
  it("maps watch, youtu.be, and shorts URLs to /embed/VIDEO_ID", () => {
    assert.equal(youtubeVideoId("https://www.youtube.com/watch?v=MxsSz_VZ4p4"), "MxsSz_VZ4p4");
    assert.equal(youtubeEmbedUrl("https://www.youtube.com/watch?v=MxsSz_VZ4p4"), "https://www.youtube.com/embed/MxsSz_VZ4p4");
    assert.equal(youtubeEmbedUrl("https://youtu.be/L_xrDAtykMI"), "https://www.youtube.com/embed/L_xrDAtykMI");
    assert.equal(youtubeEmbedUrl("https://www.youtube.com/shorts/0G2_XV7slIg"), "https://www.youtube.com/embed/0G2_XV7slIg");
    assert.equal(
      youtubeEmbedUrl("https://www.youtube.com/embed/MxsSz_VZ4p4"),
      "https://www.youtube.com/embed/MxsSz_VZ4p4",
    );
  });

  it("passes through a non-YouTube https URL", () => {
    assert.equal(youtubeEmbedUrl("https://example.com/form.mp4"), "https://example.com/form.mp4");
    assert.equal(youtubeEmbedUrl("not-a-url"), null);
  });
});

describe("foundation + Day-8 per-exercise videos", () => {
  it("stamps an http(s) videoUrl on every DEMO_BLOCK segment", () => {
    assertEverySegmentHasHttpVideo(DEMO_BLOCK, "DEMO_BLOCK");
    assert.equal(DEMO_BLOCK.workouts.length, 18);
  });

  it("stamps an http(s) videoUrl on every Day-8 fixture segment", () => {
    assertEverySegmentHasHttpVideo(day8Fixture, "day-8 fixture");
    assert.equal(day8Fixture.title, "Day 8 Foundation — 6 weeks");
    assert.equal(day8Fixture.workouts.length, 18);
    assert.deepEqual(
      day8Fixture.workouts.map((row) => (row.segments ?? []).map((segment) => segment.name)),
      DAY8_FOUNDATION_BLOCK.workouts.map((row) => (row.segments ?? []).map((segment) => segment.name)),
    );
  });

  it("stamps per-segment videos on a newly generated foundation block", () => {
    const block = generateFoundationBlock(happyIntake);
    assertEverySegmentHasHttpVideo(block, "generated foundation");
    const names = block.workouts.flatMap((row) => (row.segments ?? []).map((segment) => segment.name));
    assert.ok(names.some((name) => /easy bike or walk|easy walk-in/i.test(name)));
    assert.ok(names.some((name) => /dead bug|side plank|pallof/i.test(name)));
  });
});
