import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { blockFromIntake, emptyConsentQuestionnaire, ONBOARDING_SECTIONS, type DaveIntake } from "@ajax/shared";
import { createApp } from "../src/app.js";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "../../../fixtures");
const day8Fixture = JSON.parse(readFileSync(join(fixturesDir, "day-8-foundation-6-week.json"), "utf8")) as {
  title: string;
  durationWeeks: number;
  workouts: { week: number; day: number; title: string; videoUrl?: string | null }[];
};
const sampleIntake = JSON.parse(readFileSync(join(fixturesDir, "sample-intake.json"), "utf8")) as DaveIntake;

function filledSection(id: number) {
  const section = ONBOARDING_SECTIONS.find((s) => s.id === id)!;
  const answers: Record<string, string | number | string[]> = {};
  for (const field of section.fields) {
    if (field.type === "number" || field.type === "scale") answers[field.key] = field.min ?? 3;
    else if (field.type === "multiselect") answers[field.key] = [field.options?.[0]?.value ?? "x"];
    else if (field.type === "select") answers[field.key] = field.options?.[0]?.value ?? "x";
    else answers[field.key] = `demo-${field.key}`;
  }
  return answers;
}

describe("ajax api", () => {
  it("reports mock health without live credentials", async () => {
    const app = createApp();
    const res = await app.request("/health");
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.mode, "mock");
    assert.equal(body.tenant, "ajax");
  });

  it("stubs Apple Sign-In", async () => {
    const app = createApp();
    const res = await app.request("/auth/apple", { method: "POST" });
    assert.equal(res.status, 501);
  });

  it("blocks unknown emails and completes onboarding for a roster member", async () => {
    const app = createApp();

    const blocked = await app.request("/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-a-member@example.com" }),
    });
    assert.equal(blocked.status, 403);

    const login = await app.request("/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "member@ajax.local" }),
    });
    assert.equal(login.status, 200);
    const sessionBody = await login.json();
    const token = sessionBody.session.accessToken as string;
    const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    const consent = await app.request("/consent", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        questionnaire: {
          ...emptyConsentQuestionnaire(),
          isAdult: true,
          understandProfileStorage: true,
          acceptTerms: true,
          understandLaterConsents: true,
        },
      }),
    });
    assert.equal(consent.status, 200);

    for (let i = 1; i <= 9; i += 1) {
      const save = await app.request(`/onboarding/sections/${i}`, {
        method: "PUT",
        headers: auth,
        body: JSON.stringify({ answers: filledSection(i) }),
      });
      assert.equal(save.status, 200);
      const confirm = await app.request(`/onboarding/sections/${i}/confirm`, {
        method: "POST",
        headers: auth,
      });
      assert.equal(confirm.status, 200);
    }

    const complete = await app.request("/onboarding/complete", { method: "POST", headers: auth });
    assert.equal(complete.status, 200);
    const me = await app.request("/me", { headers: auth });
    const meBody = await me.json();
    assert.equal(meBody.next, "home");
    assert.equal(meBody.onboarding.confirmedSections.length, 9);
  });

  it("lets a coach create and assign a block, then a member list and log a workout", async () => {
    const app = createApp();

    const coachLogin = await app.request("/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "david@ajaxgym.com" }),
    });
    assert.equal(coachLogin.status, 200);
    const coachToken = (await coachLogin.json()).session.accessToken as string;
    const coachAuth = { Authorization: `Bearer ${coachToken}`, "Content-Type": "application/json" };

    const created = await app.request("/coach/blocks", {
      method: "POST",
      headers: coachAuth,
      body: JSON.stringify({
        title: "Day-8 custom — 6 weeks",
        notes: "First assigned block for the demo member.",
        durationWeeks: 6,
        workouts: [
          {
            week: 1,
            day: 1,
            title: "Lower body — settle the pattern",
            notes: "Leave two reps in reserve.",
            videoUrl: "https://www.youtube.com/watch?v=MxsSz_VZ4p4",
            segments: [{ name: "Goblet squat", prescription: "3 × 8" }],
          },
          {
            week: 1,
            day: 3,
            title: "Upper body — press and pull",
            notes: "Even tempo.",
          },
        ],
      }),
    });
    assert.equal(created.status, 201);
    const createdBody = await created.json();
    assert.equal(createdBody.program.title, "Day-8 custom — 6 weeks");
    assert.equal(createdBody.workouts.length, 2);

    const assigned = await app.request(`/coach/blocks/${createdBody.program.id}/assign`, {
      method: "POST",
      headers: coachAuth,
      body: JSON.stringify({ email: "member@ajax.local" }),
    });
    assert.equal(assigned.status, 200);
    const assignedBody = await assigned.json();
    assert.equal(assignedBody.assignment.memberEmail, "member@ajax.local");
    assert.equal(assignedBody.assignment.status, "active");

    const memberLogin = await app.request("/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "member@ajax.local" }),
    });
    const memberToken = (await memberLogin.json()).session.accessToken as string;
    const memberAuth = { Authorization: `Bearer ${memberToken}`, "Content-Type": "application/json" };

    const list = await app.request("/training/workouts", { headers: memberAuth });
    assert.equal(list.status, 200);
    const listBody = await list.json();
    assert.equal(listBody.program.title, "Day-8 custom — 6 weeks");
    assert.equal(listBody.workouts.length, 2);
    const first = listBody.workouts[0];
    assert.equal(first.videoUrl, "https://www.youtube.com/watch?v=MxsSz_VZ4p4");

    const detail = await app.request(`/training/workouts/${first.id}`, { headers: memberAuth });
    assert.equal(detail.status, 200);
    const detailBody = await detail.json();
    assert.equal(detailBody.workout.title, "Lower body — settle the pattern");

    const logged = await app.request(`/training/workouts/${first.id}/log`, {
      method: "POST",
      headers: memberAuth,
      body: JSON.stringify({
        weight: "32",
        reps: "8,8,8",
        score: "7/10",
        notes: "Quiet depth. Ready to add a little load.",
        completed: true,
      }),
    });
    assert.equal(logged.status, 200);
    const loggedBody = await logged.json();
    assert.equal(loggedBody.log.weight, "32");
    assert.equal(loggedBody.log.reps, "8,8,8");
    assert.equal(loggedBody.log.score, "7/10");
    assert.ok(loggedBody.log.completedAt);

    const forbidden = await app.request("/coach/blocks", {
      method: "POST",
      headers: memberAuth,
      body: JSON.stringify({ title: "Nope", workouts: [{ week: 1, day: 1, title: "x" }] }),
    });
    assert.equal(forbidden.status, 403);
  });

  it("ingests the Day 8 Foundation fixture and assigns it over the mock fallback", async () => {
    const app = createApp();
    assert.equal((await (await app.request("/health")).json()).mode, "mock");

    const coachLogin = await app.request("/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "david@ajaxgym.com" }),
    });
    const coachToken = (await coachLogin.json()).session.accessToken as string;
    const coachAuth = { Authorization: `Bearer ${coachToken}`, "Content-Type": "application/json" };

    const created = await app.request("/coach/blocks", {
      method: "POST",
      headers: coachAuth,
      body: JSON.stringify(day8Fixture),
    });
    assert.equal(created.status, 201);
    const createdBody = await created.json();
    assert.equal(createdBody.program.title, "Day 8 Foundation — 6 weeks");
    assert.equal(createdBody.program.durationWeeks, 6);
    assert.equal(createdBody.workouts.length, 18);
    assert.equal(createdBody.workouts.filter((row: { day: number }) => row.day === 1).length, 6);
    assert.equal(createdBody.workouts.filter((row: { day: number }) => row.day === 3).length, 6);
    assert.equal(createdBody.workouts.filter((row: { day: number }) => row.day === 5).length, 6);
    assert.ok(createdBody.workouts.some((row: { videoUrl?: string | null }) => row.videoUrl));

    const assigned = await app.request(`/coach/blocks/${createdBody.program.id}/assign`, {
      method: "POST",
      headers: coachAuth,
      body: JSON.stringify({ email: "member@ajax.local" }),
    });
    assert.equal(assigned.status, 200);

    const memberLogin = await app.request("/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "member@ajax.local" }),
    });
    const memberToken = (await memberLogin.json()).session.accessToken as string;
    const home = await app.request("/training", { headers: { Authorization: `Bearer ${memberToken}` } });
    assert.equal(home.status, 200);
    const homeBody = await home.json();
    assert.equal(homeBody.program.title, "Day 8 Foundation — 6 weeks");
    assert.equal(homeBody.workouts.length, 18);
    assert.equal(homeBody.assignment.status, "active");
  });

  it("lets Pace create and assign the Day 8 fixture with X-Coach-Key", async () => {
    const previous = process.env.COACH_API_KEY;
    process.env.COACH_API_KEY = "test-coach-key";
    try {
      const app = createApp();
      const created = await app.request("/coach/blocks", {
        method: "POST",
        headers: { "X-Coach-Key": "test-coach-key", "Content-Type": "application/json" },
        body: JSON.stringify(day8Fixture),
      });
      assert.equal(created.status, 201);
      const programId = (await created.json()).program.id as string;

      const assigned = await app.request(`/coach/blocks/${programId}/assign`, {
        method: "POST",
        headers: { "X-Coach-Key": "test-coach-key", "Content-Type": "application/json" },
        body: JSON.stringify({ email: "seth@ajaxgym.com" }),
      });
      assert.equal(assigned.status, 200);
      const assignedBody = await assigned.json();
      assert.equal(assignedBody.assignment.memberEmail, "seth@ajaxgym.com");

      const memberLogin = await app.request("/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "seth@ajaxgym.com" }),
      });
      const token = (await memberLogin.json()).session.accessToken as string;
      const home = await app.request("/training", { headers: { Authorization: `Bearer ${token}` } });
      const homeBody = await home.json();
      assert.equal(homeBody.program.title, "Day 8 Foundation — 6 weeks");
      assert.equal(homeBody.workouts.length, 18);
    } finally {
      if (previous === undefined) delete process.env.COACH_API_KEY;
      else process.env.COACH_API_KEY = previous;
    }
  });

  it("maps sample intake, creates and assigns with X-Coach-Key, then the member lists the block", async () => {
    const previous = process.env.COACH_API_KEY;
    process.env.COACH_API_KEY = "test-coach-key";
    try {
      const app = createApp();
      const block = blockFromIntake(sampleIntake);
      assert.equal(block.workouts.length, 18);

      const created = await app.request("/coach/blocks", {
        method: "POST",
        headers: { "X-Coach-Key": "test-coach-key", "Content-Type": "application/json" },
        body: JSON.stringify(block),
      });
      assert.equal(created.status, 201);
      const createdBody = await created.json();
      assert.equal(createdBody.program.title, "Demo Member — 6 weeks");
      assert.equal(createdBody.workouts.length, 18);

      const assigned = await app.request(`/coach/blocks/${createdBody.program.id}/assign`, {
        method: "POST",
        headers: { "X-Coach-Key": "test-coach-key", "Content-Type": "application/json" },
        body: JSON.stringify({ email: "member@ajax.local" }),
      });
      assert.equal(assigned.status, 200);

      const memberLogin = await app.request("/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "member@ajax.local" }),
      });
      const token = (await memberLogin.json()).session.accessToken as string;
      const home = await app.request("/training", { headers: { Authorization: `Bearer ${token}` } });
      assert.equal(home.status, 200);
      const homeBody = await home.json();
      assert.equal(homeBody.program.title, "Demo Member — 6 weeks");
      assert.equal(homeBody.workouts.length, 18);
      assert.equal(homeBody.assignment.status, "active");
      assert.match(homeBody.program.notes, /Ski-season durability/);
      assert.match(homeBody.program.notes, /M2 first pass — coach may swap/);
      assert.equal(homeBody.workouts.filter((row: { day: number }) => row.day === 1).length, 6);
      assert.equal(homeBody.workouts.filter((row: { day: number }) => row.day === 3).length, 6);
      assert.equal(homeBody.workouts.filter((row: { day: number }) => row.day === 5).length, 6);
    } finally {
      if (previous === undefined) delete process.env.COACH_API_KEY;
      else process.env.COACH_API_KEY = previous;
    }
  });

  it("assigns from intake in one POST with X-Coach-Key (Dave handoff)", async () => {
    const previous = process.env.COACH_API_KEY;
    process.env.COACH_API_KEY = "test-coach-key";
    try {
      const app = createApp();
      const created = await app.request("/coach/assign-from-intake", {
        method: "POST",
        headers: { "X-Coach-Key": "test-coach-key", "Content-Type": "application/json" },
        body: JSON.stringify({ email: "member@ajax.local", intake: sampleIntake }),
      });
      assert.equal(created.status, 201);
      const createdBody = await created.json();
      assert.equal(createdBody.program.title, "Demo Member — 6 weeks");
      assert.equal(createdBody.workouts.length, 18);
      assert.equal(createdBody.assignment.memberEmail, "member@ajax.local");
      assert.equal(createdBody.assignment.status, "active");
      assert.match(createdBody.program.notes, /M2 first pass — coach may swap/);

      const memberLogin = await app.request("/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "member@ajax.local" }),
      });
      const token = (await memberLogin.json()).session.accessToken as string;
      const home = await app.request("/training", { headers: { Authorization: `Bearer ${token}` } });
      assert.equal(home.status, 200);
      const homeBody = await home.json();
      assert.equal(homeBody.program.title, "Demo Member — 6 weeks");
      assert.equal(homeBody.workouts.length, 18);
      assert.equal(homeBody.assignment.status, "active");
    } finally {
      if (previous === undefined) delete process.env.COACH_API_KEY;
      else process.env.COACH_API_KEY = previous;
    }
  });

  it("accepts a flat sample-intake.json body on /coach/assign-from-intake", async () => {
    const previous = process.env.COACH_API_KEY;
    process.env.COACH_API_KEY = "test-coach-key";
    try {
      const app = createApp();
      const created = await app.request("/coach/assign-from-intake", {
        method: "POST",
        headers: { "X-Coach-Key": "test-coach-key", "Content-Type": "application/json" },
        body: JSON.stringify(sampleIntake),
      });
      assert.equal(created.status, 201);
      const body = await created.json();
      assert.equal(body.assignment.memberEmail, "member@ajax.local");
      assert.equal(body.workouts.length, 18);
    } finally {
      if (previous === undefined) delete process.env.COACH_API_KEY;
      else process.env.COACH_API_KEY = previous;
    }
  });

  it("rejects assign-from-intake without a roster email or a label", async () => {
    const previous = process.env.COACH_API_KEY;
    process.env.COACH_API_KEY = "test-coach-key";
    try {
      const app = createApp();
      const noEmail = await app.request("/coach/assign-from-intake", {
        method: "POST",
        headers: { "X-Coach-Key": "test-coach-key", "Content-Type": "application/json" },
        body: JSON.stringify({ name: "No Email Yet", goals: "Ski" }),
      });
      assert.equal(noEmail.status, 400);
      assert.equal((await noEmail.json()).error, "invalid_email");

      const empty = await app.request("/coach/assign-from-intake", {
        method: "POST",
        headers: { "X-Coach-Key": "test-coach-key", "Content-Type": "application/json" },
        body: JSON.stringify({ email: "member@ajax.local", intake: {} }),
      });
      assert.equal(empty.status, 400);
      assert.equal((await empty.json()).error, "invalid_intake");

      const unknown = await app.request("/coach/assign-from-intake", {
        method: "POST",
        headers: { "X-Coach-Key": "test-coach-key", "Content-Type": "application/json" },
        body: JSON.stringify({ email: "not-a-member@example.com", name: "Ghost", goals: "Ski" }),
      });
      assert.equal(unknown.status, 400);
      assert.equal((await unknown.json()).error, "not_on_roster");

      const memberLogin = await app.request("/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "member@ajax.local" }),
      });
      const memberToken = (await memberLogin.json()).session.accessToken as string;
      const forbidden = await app.request("/coach/assign-from-intake", {
        method: "POST",
        headers: { Authorization: `Bearer ${memberToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(sampleIntake),
      });
      assert.equal(forbidden.status, 403);
    } finally {
      if (previous === undefined) delete process.env.COACH_API_KEY;
      else process.env.COACH_API_KEY = previous;
    }
  });

  it("rejects a mismatched X-Coach-Key when COACH_API_KEY is set", async () => {
    const previous = process.env.COACH_API_KEY;
    process.env.COACH_API_KEY = "test-coach-key";
    try {
      const app = createApp();
      const res = await app.request("/coach/blocks", {
        method: "POST",
        headers: { "X-Coach-Key": "wrong-key", "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Nope", workouts: [{ week: 1, day: 1, title: "x" }] }),
      });
      assert.equal(res.status, 401);
    } finally {
      if (previous === undefined) delete process.env.COACH_API_KEY;
      else process.env.COACH_API_KEY = previous;
    }
  });

  it("seeds a demo assignment for member@ajax.local", async () => {
    const app = createApp();
    const login = await app.request("/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "member@ajax.local" }),
    });
    const token = (await login.json()).session.accessToken as string;
    const home = await app.request("/training", { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(home.status, 200);
    const body = await home.json();
    assert.equal(body.program.title, "Ajax Foundation — 6 weeks");
    assert.equal(body.workouts.length, 18);
    assert.equal(body.workouts[0].week, 1);
    assert.ok(body.workouts.some((row: { videoUrl?: string | null }) => row.videoUrl));
  });
});
