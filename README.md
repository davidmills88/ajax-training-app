# Ajax Training App

Greenfield adaptive training app for Ajax Fitness (Aspen).

Product brief (v2): https://docs.google.com/document/d/1bBPID6w7RDDYI08gQ63wlU6TJKc5fTofJmHpiuGVgE8/edit

Client Onboarding Prompt (source of the 9 sections): https://docs.google.com/document/d/1za97YJbqU-dJesfeImj437KW2k4QA9ybVDh9cDheFP4/edit

M0 stack (locked working baseline): Expo (React Native) iOS-first · Hono API · Postgres + RLS · magic-link auth first.

This initial commit unblocked Cursor cloud / Slack agents (empty repos cannot start agents). This tree is the real M0 scaffold: auth, manual Ajax roster, account/privacy consent, and the full 9-section onboarding → Client Summary.

## What M0 is

- **Monorepo:** `apps/mobile` (Expo / TypeScript, iOS-first), `apps/api` (Hono / TypeScript), `packages/shared` (onboarding + roster domain), `supabase/` (Postgres schema with `tenant_id` + RLS).
- **Auth:** magic-link path. Supabase Auth is used when `SUPABASE_URL` + keys are present. Without credentials the API issues a mock session so the app still runs. Apple Sign-In is stubbed (button visible, not implemented).
- **Roster:** manual Ajax member list. No Wellyx gate in M0. Seeded emails: `david@ajaxgym.com`, `seth@ajaxgym.com`, `member@ajax.local`.
- **Onboarding:** all 9 Client Onboarding Prompt sections, one at a time, recap + confirm, then a member-editable Client Summary.
- **Consent:** account/privacy questionnaire only. Health-data and SMS consent are later.
- **Tenancy:** Ajax-first, multi-tenant ready (`tenant_id` on every table, RLS policies).
- **Fallback:** if env / Supabase / Expo credentials are missing, the API uses an in-memory store and the mobile app can fall back to the same domain store.

## What M0 is not

Workout engine, wearables ingest, Grok AI overlay, GLM SMS, Stripe, admin audit UI, Redis, TrainingPeaks API.

Locked and not reopened: own in-app engine (later), wearables later (Apple Health + Eight Sleep first), programming fully automated with audit-only oversight (engine not in this milestone).

## Setup

Requires Node 20+.

```bash
cp .env.example .env
npm install
```

### Run without live credentials (default)

```bash
# terminal 1
npm run dev:api

# terminal 2 — iOS simulator / Expo Go
npm run dev:mobile

# or exercise the same UI in a browser
npm run dev:web
```

Sign in with `member@ajax.local` (or another seeded roster email). In mock mode the API does not send email; it returns a session immediately.

### Optional live path (Supabase + Postgres)

1. Create a Supabase project.
2. Run `supabase/migrations/0001_init.sql` then `supabase/seed.sql`.
3. Set `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in `.env`.
4. Set `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` and `EXPO_PUBLIC_USE_MOCK=0` for the app.
5. Enable email magic links in Supabase Auth. Apple Sign-In stays stubbed.

If `DATABASE_URL` is set but Postgres is down, the API logs a warning and stays on the in-memory mock.

### Tests

```bash
npm test
```

## Repo map

```
apps/api          Hono server — health, magic-link, roster, consent, onboarding
apps/mobile       Expo app — login → consent → 9 sections → summary → home
packages/shared   Section definitions, Client Summary builder, in-memory store
supabase/         Postgres + RLS for tenants, roster, users, consents, onboarding
```

## Voice

Premium, approachable, confident, warm. Ajax is Aspen strength / longevity / recovery — not gym-bro, not 24-hour.
