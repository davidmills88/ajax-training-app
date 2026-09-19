import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FOUNDATION_DURATION_WEEKS,
  FOUNDATION_SESSION_DAYS,
  FOUNDATION_WEEK_THEMES,
  M2_FIRST_PASS_MARK,
  detectLimitations,
  generateFoundationBlock,
  validateCreateBlock,
  type DaveIntake,
} from "../src/index.js";

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

const kneeIntake: DaveIntake = {
  ...happyIntake,
  name: "Jordan",
  limitationsInjuries: "Old left knee sprain. Avoid deep loaded lunges if it chatters.",
};

function segmentNames(intake: DaveIntake): string[] {
  return generateFoundationBlock(intake).workouts.flatMap((workout) =>
    (workout.segments ?? []).map((segment) => segment.name),
  );
}

function segmentBlob(intake: DaveIntake): string {
  return generateFoundationBlock(intake)
    .workouts.flatMap((workout) =>
      (workout.segments ?? []).map((segment) => `${segment.name} ${segment.notes ?? ""} ${segment.prescription ?? ""}`),
    )
    .join("\n")
    .toLowerCase();
}

describe("generateFoundationBlock", () => {
  it("builds a 6-week 3×/week first pass from Client Summary fields", () => {
    const block = generateFoundationBlock(happyIntake);
    assert.deepEqual(validateCreateBlock(block), []);
    assert.equal(block.title, "Alex — 6 weeks");
    assert.equal(block.durationWeeks, FOUNDATION_DURATION_WEEKS);
    assert.equal(block.workouts.length, 18);
    assert.deepEqual(
      [...new Set(block.workouts.map((row) => row.day))].sort(),
      [...FOUNDATION_SESSION_DAYS],
    );
    assert.equal(
      block.workouts.filter((row) => FOUNDATION_SESSION_DAYS.includes(row.day as 1 | 3 | 5)).length,
      18,
    );
    assert.match(block.notes ?? "", new RegExp(M2_FIRST_PASS_MARK));
    assert.match(block.notes ?? "", /settle → load → density → strength → power-ish → settle/);
    assert.match(block.notes ?? "", /Quiet strength/);
    assert.match(block.notes ?? "", /Ajax gym/);

    for (let week = 1; week <= 6; week += 1) {
      const sessions = block.workouts.filter((row) => row.week === week);
      assert.equal(sessions.length, 3);
      assert.deepEqual(
        sessions.map((row) => row.day),
        [1, 3, 5],
      );
      assert.match(sessions[0].title, new RegExp(FOUNDATION_WEEK_THEMES[week - 1] === "power-ish" ? "power" : FOUNDATION_WEEK_THEMES[week - 1]));
    }

    assert.ok(block.workouts.some((row) => (row.notes ?? "").includes("Goal thread: Quiet strength")));
    assert.ok(block.workouts.some((row) => (row.notes ?? "").includes("Availability: 3 days/week")));
    assert.ok(block.workouts.every((row) => (row.notes ?? "").includes("Equipment:")));
    assert.ok(block.workouts.some((row) => row.videoUrl?.includes("http")));
    assert.ok(segmentNames(happyIntake).some((name) => /split squat/i.test(name)));
    assert.ok(segmentNames(happyIntake).some((name) => /broad jump/i.test(name)));
  });

  it("swaps deep loaded lunges and jumps when a knee limitation is mentioned", () => {
    assert.equal(detectLimitations(kneeIntake.limitationsInjuries ?? "").knee, true);

    const block = generateFoundationBlock(kneeIntake);
    assert.deepEqual(validateCreateBlock(block), []);
    assert.match(block.notes ?? "", /M2 first pass — coach may swap/);
    assert.match(block.notes ?? "", /Limitation swaps applied: knee/);
    assert.match(block.notes ?? "", /Old left knee sprain/);

    const names = segmentNames(kneeIntake);
    assert.ok(!names.some((name) => /split squat|cossack|broad jump|box step-up|lunge/i.test(name)));
    assert.ok(names.some((name) => /glute bridge/i.test(name)));
    assert.ok(names.some((name) => /sit-to-stand|high box/i.test(name)));
    assert.ok(names.some((name) => /med-ball chest pass/i.test(name)));
    assert.ok(names.some((name) => /lateral band walk/i.test(name)));

    const blob = segmentBlob(kneeIntake);
    assert.match(blob, /knee limitation/);
    assert.ok(block.workouts.some((row) => (row.notes ?? "").includes("Watch:")));
    assert.ok(block.workouts.some((row) => /Split squat → Glute bridge \(knee\)/.test(row.notes ?? "")));
  });

  it("folds limited equipment and a short session into segment prescriptions", () => {
    const block = generateFoundationBlock({
      name: "Sam",
      goals: "Stay consistent while traveling",
      trainingAvailability: "3 days/week · About 30 minutes · Evening",
      equipmentAccess: "Limited equipment",
    });
    assert.match(block.notes ?? "", /limited kit/i);
    const names = block.workouts.flatMap((row) => (row.segments ?? []).map((segment) => segment.name)).join(" ");
    assert.match(names, /Sit-to-stand|Backpack|Elevated push-up|Zone 2 walk/);
    const firstLower = block.workouts.find((row) => row.week === 1 && row.day === 1);
    assert.ok(firstLower?.segments?.some((segment) => segment.prescription?.startsWith("2 ×")));
    assert.ok(firstLower?.segments?.some((segment) => (segment.notes ?? "").includes("Short session")));
  });
});
