import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildClientSummary, emptyConsentQuestionnaire, ONBOARDING_SECTIONS } from "../src/index.js";
import { AjaxStoreError, InMemoryAjaxStore } from "../src/store.js";

function filledSection(id: number) {
  const section = ONBOARDING_SECTIONS.find((s) => s.id === id)!;
  const answers: Record<string, string | number | string[]> = {};
  for (const field of section.fields) {
    if (field.type === "number" || field.type === "scale") answers[field.key] = field.min ?? 3;
    else if (field.type === "multiselect") answers[field.key] = [field.options?.[0]?.value ?? "x"];
    else if (field.type === "select") answers[field.key] = field.options?.[0]?.value ?? "x";
    else answers[field.key] = `demo-${field.key}`;
  }
  if (id === 1) {
    answers.fullName = "Seth";
    answers.age = 34;
  }
  if (id === 2) {
    answers.goal1 = "Ski season durability";
    answers.whyImportant = "Stay on snow without blowing up";
  }
  return answers;
}

describe("InMemoryAjaxStore", () => {
  it("rejects emails that are not on the Ajax roster", () => {
    const store = new InMemoryAjaxStore();
    assert.throws(() => store.issueSession("stranger@example.com"), (err: unknown) => {
      return err instanceof AjaxStoreError && err.code === "not_on_roster";
    });
  });

  it("walks consent, nine confirmed sections, editable summary, then complete", () => {
    const store = new InMemoryAjaxStore();
    const session = store.issueSession("seth@ajaxgym.com");
    assert.equal(session.user.tenantId, store.tenantId);
    assert.equal(store.getMe(session.user).next, "consent");

    const questionnaire = {
      ...emptyConsentQuestionnaire(),
      isAdult: true,
      understandProfileStorage: true,
      acceptTerms: true,
      understandLaterConsents: true,
      hearAboutUs: "Front desk",
    };
    store.saveConsent(session.user, questionnaire);
    assert.equal(store.getMe(session.user).next, "onboarding");

    for (let i = 1; i <= 9; i += 1) {
      store.saveSection(session.user, i, filledSection(i));
      store.confirmSection(session.user, i);
    }

    const ready = store.getMe(session.user);
    assert.equal(ready.next, "summary");
    assert.equal(ready.onboarding?.confirmedSections.length, 9);
    assert.equal(ready.onboarding?.clientSummary?.name, "Seth");

    store.updateSummary(session.user, {
      ...ready.onboarding!.clientSummary!,
      goals: "Edited: ski durability and longevity",
    });
    store.completeOnboarding(session.user);
    assert.equal(store.getMe(session.user).next, "home");
    assert.equal(store.getMe(session.user).onboarding?.clientSummary?.goals, "Edited: ski durability and longevity");
  });

  it("builds a client summary from the nine sections", () => {
    const sections = Object.fromEntries(ONBOARDING_SECTIONS.map((s) => [s.id, filledSection(s.id)]));
    const summary = buildClientSummary(sections as never);
    assert.match(summary.name, /Seth/);
    assert.match(summary.goals, /Ski season/);
    assert.ok(summary.trainingAvailability.length > 0);
  });
});
