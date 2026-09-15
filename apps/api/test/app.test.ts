import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyConsentQuestionnaire, ONBOARDING_SECTIONS } from "@ajax/shared";
import { createApp } from "../src/app.js";

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
});
