import {
  AjaxStoreError,
  CONSENT_COPY,
  isOnboardingSectionId,
  ONBOARDING_SECTIONS,
  recapSection,
  type ConsentQuestionnaire,
  type OnboardingAnswers,
} from "@ajax/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { runtimeMode } from "./env.js";
import { memoryRepo, type AjaxRepo } from "./repo.js";

export function createApp(store: AjaxRepo = memoryRepo()) {
  const app = new Hono();
  const mode = runtimeMode();

  app.use(
    "*",
    cors({
      origin: "*",
      allowHeaders: ["Authorization", "Content-Type"],
      allowMethods: ["GET", "POST", "PUT", "OPTIONS"],
    }),
  );

  app.onError((err, c) => {
    if (err instanceof AjaxStoreError) {
      const status = err.code === "unauthorized" ? 401 : err.code === "not_found" ? 404 : 400;
      return c.json({ error: err.code, message: err.message }, status);
    }
    console.error(err);
    return c.json({ error: "internal", message: "Something went wrong." }, 500);
  });

  async function requireUser(c: { req: { header: (name: string) => string | undefined } }) {
    const header = c.req.header("Authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) throw new AjaxStoreError("unauthorized", "Sign in to continue.");
    return store.userFromToken(token);
  }

  app.get("/health", (c) =>
    c.json({
      ok: true,
      service: "ajax-api",
      mode,
      tenant: store.tenantSlug,
    }),
  );

  app.get("/meta", (c) =>
    c.json({
      mode,
      tenant: { id: store.tenantId, slug: store.tenantSlug, name: "Ajax Fitness" },
      appleSignIn: "stubbed",
      onboardingSections: ONBOARDING_SECTIONS.map((s) => ({ id: s.id, title: s.title })),
      consent: CONSENT_COPY,
    }),
  );

  app.get("/roster/check", async (c) => {
    const email = c.req.query("email") ?? "";
    const entry = await store.findRoster(email);
    return c.json({
      allowed: Boolean(entry && entry.status === "active"),
      tenant: store.tenantSlug,
    });
  });

  app.get("/roster", async (c) => {
    await requireUser(c);
    const members = await store.listRoster();
    return c.json({
      tenant: store.tenantSlug,
      members: members.map((row) => ({
        email: row.email,
        fullName: row.fullName,
        status: row.status,
      })),
    });
  });

  app.post("/auth/magic-link", async (c) => {
    const body = await c.req.json<{ email?: string }>().catch(() => ({ email: "" }));
    const email = body.email ?? "";
    if (!email.includes("@")) {
      return c.json({ error: "invalid_email", message: "Enter a valid email." }, 400);
    }

    if (mode === "live" && process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      const roster = await store.findRoster(email);
      if (!roster || roster.status !== "active") {
        return c.json({
          sent: true,
          message: "If this email is on the Ajax roster, check your inbox.",
        });
      }
      const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/otp`, {
        method: "POST",
        headers: {
          apikey: process.env.SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, create_user: true }),
      });
      if (!response.ok) {
        return c.json({ error: "otp_failed", message: "Could not send the magic link." }, 502);
      }
      return c.json({ sent: true, message: "Check your email for the Ajax sign-in link." });
    }

    try {
      const session = await store.issueSession(email);
      return c.json({
        sent: true,
        mock: true,
        message: "Mock mode: signed in without sending email.",
        session,
      });
    } catch (err) {
      if (err instanceof AjaxStoreError && err.code === "not_on_roster") {
        return c.json(
          {
            sent: false,
            error: "not_on_roster",
            message: "This email is not on the Ajax member list yet. Ask the front desk to add you.",
          },
          403,
        );
      }
      throw err;
    }
  });

  app.post("/auth/apple", (c) =>
    c.json(
      {
        error: "not_implemented",
        message: "Apple Sign-In is stubbed for a later milestone.",
      },
      501,
    ),
  );

  app.get("/me", async (c) => {
    const user = await requireUser(c);
    return c.json(await store.getMe(user));
  });

  app.post("/consent", async (c) => {
    const user = await requireUser(c);
    const body = await c.req.json<{ questionnaire?: ConsentQuestionnaire }>();
    if (!body.questionnaire) {
      return c.json({ error: "invalid_consent", message: "Questionnaire is required." }, 400);
    }
    const consent = await store.saveConsent(user, body.questionnaire);
    return c.json({ consent, me: await store.getMe(user) });
  });

  app.get("/onboarding", async (c) => {
    const user = await requireUser(c);
    const profile = await store.getOnboarding(user);
    const current = isOnboardingSectionId(profile.currentSection) ? profile.currentSection : 1;
    return c.json({
      profile,
      sections: ONBOARDING_SECTIONS,
      recap: recapSection(current, profile.sections[current] ?? {}),
    });
  });

  app.put("/onboarding/sections/:id", async (c) => {
    const user = await requireUser(c);
    const id = Number(c.req.param("id"));
    const body = await c.req.json<{ answers?: OnboardingAnswers }>();
    const profile = await store.saveSection(user, id, body.answers ?? {});
    const sectionId = isOnboardingSectionId(id) ? id : 1;
    return c.json({ profile, recap: recapSection(sectionId, profile.sections[sectionId] ?? {}) });
  });

  app.post("/onboarding/sections/:id/confirm", async (c) => {
    const user = await requireUser(c);
    const id = Number(c.req.param("id"));
    const profile = await store.confirmSection(user, id);
    return c.json({ profile, me: await store.getMe(user) });
  });

  app.get("/onboarding/summary", async (c) => {
    const user = await requireUser(c);
    const profile = await store.getOnboarding(user);
    return c.json({ summary: profile.clientSummary, profile });
  });

  app.put("/onboarding/summary", async (c) => {
    const user = await requireUser(c);
    const body = await c.req.json<{ summary?: Parameters<AjaxRepo["updateSummary"]>[1] }>();
    if (!body.summary) {
      return c.json({ error: "invalid_summary", message: "Summary is required." }, 400);
    }
    const profile = await store.updateSummary(user, body.summary);
    return c.json({ summary: profile.clientSummary, profile });
  });

  app.post("/onboarding/complete", async (c) => {
    const user = await requireUser(c);
    const profile = await store.completeOnboarding(user);
    return c.json({ profile, me: await store.getMe(user) });
  });

  return app;
}
