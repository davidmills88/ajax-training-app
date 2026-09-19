import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { magicLinkVerifySkipReason } from "@ajax/shared";
import { createApp } from "../src/app.js";

describe("POST /coach/assign-from-intake", () => {
  it("maps nested intake with skeleton overlay and assigns in one call", async () => {
    const previous = process.env.COACH_API_KEY;
    process.env.COACH_API_KEY = "test-coach-key";
    try {
      const app = createApp();
      const created = await app.request("/coach/assign-from-intake", {
        method: "POST",
        headers: { "X-Coach-Key": "test-coach-key", "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "seth@ajaxgym.com",
          skeleton: true,
          intake: {
            name: "Seth",
            goals: "Quiet strength",
            limitationsInjuries: "Cranky left shoulder",
          },
        }),
      });
      assert.equal(created.status, 201);
      const body = await created.json();
      assert.equal(body.assignment.memberEmail, "seth@ajaxgym.com");
      assert.equal(body.assignment.status, "active");
      assert.equal(body.workouts.length, 18);
      assert.match(body.program.notes, /Skeleton 6-week block/);
      assert.equal(body.program.title, "Seth — 6 weeks");

      const memberLogin = await app.request("/auth/coach-session", {
        method: "POST",
        headers: { "X-Coach-Key": "test-coach-key", "Content-Type": "application/json" },
        body: JSON.stringify({ email: "seth@ajaxgym.com" }),
      });
      const token = (await memberLogin.json()).session.accessToken as string;
      const home = await app.request("/training", { headers: { Authorization: `Bearer ${token}` } });
      assert.equal((await home.json()).program.title, "Seth — 6 weeks");
    } finally {
      if (previous === undefined) delete process.env.COACH_API_KEY;
      else process.env.COACH_API_KEY = previous;
    }
  });

  it("does not send magic-link or other member mail as part of assign", async () => {
    const previous = process.env.COACH_API_KEY;
    process.env.COACH_API_KEY = "test-coach-key";
    try {
      const app = createApp();
      const created = await app.request("/coach/assign-from-intake", {
        method: "POST",
        headers: { "X-Coach-Key": "test-coach-key", "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "member@ajax.local",
          name: "No Mail",
          goals: "Ski-season durability",
        }),
      });
      assert.equal(created.status, 201);
      const body = await created.json();
      assert.equal(body.assignment.status, "active");
      assert.equal(body.sent, undefined);
      assert.equal(body.session, undefined);
    } finally {
      if (previous === undefined) delete process.env.COACH_API_KEY;
      else process.env.COACH_API_KEY = previous;
    }
  });

  it("documents otp_failed as a skip for assign:from-intake --run verify", () => {
    const reason = magicLinkVerifySkipReason(502, { error: "otp_failed", message: "Could not send the magic link." });
    assert.ok(reason);
    assert.match(reason, /otp_failed/);
    assert.match(reason, /coach-session/);
  });
});
