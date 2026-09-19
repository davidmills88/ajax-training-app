import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  M2_FIRST_PASS_MARK,
  blockFromIntake,
  magicLinkVerifySkipReason,
  parseAssignFromIntakeBody,
  resolveIntakeEmail,
  validateCreateBlock,
  validateIntake,
  type DaveIntake,
} from "../src/index.js";
import { InMemoryAjaxStore } from "../src/store.js";

const sampleIntake = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/sample-intake.json"), "utf8"),
) as DaveIntake;

describe("blockFromIntake", () => {
  it("maps the sample Client Summary fixture to a 6-week 3×/week coach body", () => {
    assert.deepEqual(validateIntake(sampleIntake), []);
    assert.equal(resolveIntakeEmail(sampleIntake), "member@ajax.local");

    const block = blockFromIntake(sampleIntake);
    assert.deepEqual(validateCreateBlock(block), []);
    assert.equal(block.title, "Demo Member — 6 weeks");
    assert.equal(block.durationWeeks, 6);
    assert.equal(block.workouts.length, 18);
    const days = new Set(block.workouts.map((row) => row.day));
    assert.deepEqual([...days].sort(), [1, 3, 5]);
    assert.match(block.notes ?? "", new RegExp(M2_FIRST_PASS_MARK));
    assert.match(block.notes ?? "", /Ski-season durability/);
    assert.match(block.notes ?? "", /Old left knee sprain/);
    assert.ok(block.workouts.some((row) => row.videoUrl?.includes("MxsSz_VZ4p4")));
    assert.ok(block.workouts.some((row) => (row.notes ?? "").includes("Goal thread")));
    assert.ok(block.workouts.some((row) => (row.notes ?? "").includes("Watch:")));
    const names = block.workouts.flatMap((row) => (row.segments ?? []).map((segment) => segment.name));
    assert.ok(!names.some((name) => /split squat|cossack|broad jump/i.test(name)));
  });

  it("keeps the M1.2 DEMO_BLOCK overlay behind { skeleton: true }", () => {
    const block = blockFromIntake(sampleIntake, { skeleton: true });
    assert.deepEqual(validateCreateBlock(block), []);
    assert.equal(block.workouts.length, 18);
    assert.match(block.notes ?? "", /Skeleton 6-week block/);
    assert.ok(!block.notes?.includes(M2_FIRST_PASS_MARK));
    const names = block.workouts.flatMap((row) => (row.segments ?? []).map((segment) => segment.name));
    assert.ok(names.some((name) => /split squat/i.test(name)));
  });

  it("accepts a nested clientSummary and optional title override", () => {
    const block = blockFromIntake({
      title: "Day-8 custom — 6 weeks",
      email: "seth@ajaxgym.com",
      clientSummary: {
        name: "Seth",
        goals: "Quiet strength",
        limitationsInjuries: "Cranky left shoulder",
      },
    });
    assert.equal(block.title, "Day-8 custom — 6 weeks");
    assert.match(block.notes ?? "", /Quiet strength/);
    assert.match(block.notes ?? "", /Cranky left shoulder/);
  });

  it("rejects an empty intake and a non-http video URL", () => {
    assert.match(validateIntake({}).join(" "), /title, name, or goals/);
    assert.match(validateIntake({ name: "A", videos: { lower: "notaurl" } }).join(" "), /http/);
  });

  it("parses a flat Dave body and a nested { email, intake } wrapper", () => {
    const flat = parseAssignFromIntakeBody(sampleIntake);
    assert.equal(flat.email, "member@ajax.local");
    assert.equal(flat.skeleton, false);
    assert.equal(flat.intake.name, "Demo Member");

    const nested = parseAssignFromIntakeBody({
      email: "seth@ajaxgym.com",
      skeleton: true,
      intake: { name: "Seth", goals: "Quiet strength" },
    });
    assert.equal(nested.email, "seth@ajaxgym.com");
    assert.equal(nested.skeleton, true);
    assert.equal(nested.intake.name, "Seth");
    assert.equal(nested.intake.goals, "Quiet strength");
  });

  it("treats live magic-link otp_failed as a skip, not a hard failure", () => {
    assert.match(magicLinkVerifySkipReason(502, { error: "otp_failed" }) ?? "", /otp_failed/);
    assert.match(magicLinkVerifySkipReason(200, { sent: true }) ?? "", /did not return a session/);
    assert.equal(magicLinkVerifySkipReason(403, { error: "not_on_roster" }), null);
    assert.equal(magicLinkVerifySkipReason(200, { session: { accessToken: "t" } }), null);
  });

  it("creates, assigns, and lists the mapped block for the member", () => {
    const store = new InMemoryAjaxStore();
    const coach = store.issueSession("david@ajaxgym.com").user;
    const program = store.createBlock(coach, blockFromIntake(sampleIntake));
    const assignment = store.assignBlock(coach, program.id, "member@ajax.local");
    const home = store.getTrainingHome(store.issueSession("member@ajax.local").user);
    assert.equal(home.program?.title, "Demo Member — 6 weeks");
    assert.equal(home.workouts.length, 18);
    assert.equal(assignment.status, "active");
    assert.ok(home.workouts[0].notes.includes("Ski-season"));
  });
});
