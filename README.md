# Ajax Training App

Greenfield adaptive training app for Ajax Fitness (Aspen).

Product brief (v2): https://docs.google.com/document/d/1bBPID6w7RDDYI08gQ63wlU6TJKc5fTofJmHpiuGVgE8/edit

Client Onboarding Prompt (source of the 9 sections): https://docs.google.com/document/d/1za97YJbqU-dJesfeImj437KW2k4QA9ybVDh9cDheFP4/edit

M0 stack (locked working baseline): Expo (React Native) iOS-first · Hono API · Postgres + RLS · magic-link auth first.

M0 on main: auth, manual Ajax roster, account/privacy consent, and the full 9-section onboarding → Client Summary.

M1 on main: an assigned 6-week block, workout detail with optional video, and a simple result log — the thinnest loop so Ajax can deliver a Day-8 custom program.

M1.1 on main: EAS / Expo placeholders for a later TestFlight, live-Supabase docs + a Day-8 fixture the coach API can ingest. No Apple secrets. No required cloud build.

M1.2 on main: Dave → assign handoff. Map Client Summary / intake JSON to a 6-week block and assign it without David. See [docs/dave-assign-handoff.md](docs/dave-assign-handoff.md).

M2.0 (this tree): first auto block from Client Summary — 6 weeks × 3 (days 1 / 3 / 5), week-theme templates, simple knee/shoulder/back swaps. Still coach-editable. See [docs/m2-foundation-generator.md](docs/m2-foundation-generator.md).

## Ownership & intended orgs

Lily (COS) owns end-to-end product and architecture decisions for this app. David logins and money-touching steps come later — do not wait on them to keep M0 moving.

| Surface | Intended owner account | M0 status |
| --- | --- | --- |
| GitHub | `davidmills88` / Ajax Fitness owner | This repo |
| Supabase (Auth + Postgres) | Same Ajax Fitness owner account | Live project `ajax-training-app`: M0 + `0002` + seed already applied (ops box). App still mocks if env is blank. |
| API host | Vercel or Fly, same owner | [Go-live](docs/go-live.md): Vercel function + env. Local `npm run dev:api` still works. |
| Apple Developer | `david@ajaxgym.com` | Planned for TestFlight / Sign in with Apple. **Do not block M0** on creating the team. Apple Sign-In stays stubbed. |
| Expo / EAS | `david@ajaxgym.com` Expo account | Placeholders in `apps/mobile` (`com.ajaxgym.training`, `eas.json` `preview`). **Do not block** on creating the account. Expo Go / web + mock auth is the default. |

No live credentials belong in this repo. `.env.example` files use labeled placeholders only; copy to `.env` locally when a project exists. See [docs/go-live.md](docs/go-live.md) and [docs/supabase-setup.md](docs/supabase-setup.md).

## What M0 is

- **Monorepo:** `apps/mobile` (Expo / TypeScript, iOS-first), `apps/api` (Hono / TypeScript), `packages/shared` (onboarding + roster domain), `supabase/` (Postgres schema with `tenant_id` + RLS).
- **Auth:** magic-link path. Supabase Auth is used when `SUPABASE_URL` + keys are present. Without credentials the API issues a mock session so the app still runs. Apple Sign-In is stubbed (button visible, not implemented).
- **Roster:** manual Ajax member list. No Wellyx gate in M0. Seeded emails: `david@ajaxgym.com`, `seth@ajaxgym.com`, `member@ajax.local`.
- **Onboarding:** all 9 Client Onboarding Prompt sections, one at a time, recap + confirm, then a member-editable Client Summary.
- **Consent:** account/privacy questionnaire only. Health-data and SMS consent are later.
- **Tenancy:** Ajax-first, multi-tenant ready (`tenant_id` on every table, RLS policies).
- **Fallback:** if env / Supabase / Expo credentials are missing, the API uses an in-memory store and the mobile app can fall back to the same domain store.

## What M1 is

- **Assigned block:** a coach (or Pace via API) creates a 6-week program of workouts and assigns it to a roster email.
- **Member home:** after onboarding, the member sees the active block by week/day, with optional `video_url`.
- **Result log:** weight, reps, score, notes, and mark complete. One log per workout per assignment.
- **Seed:** `member@ajax.local` already has the demo “Ajax Foundation — 6 weeks” block. In mock mode that member is also marked onboarding-complete so home is immediate.
- **Coach API:** `POST /coach/blocks` + `POST /coach/blocks/:id/assign`. Owner session (`david@ajaxgym.com`) or `X-Coach-Key` when `COACH_API_KEY` is set.
- **Day-8 fixture:** `fixtures/day-8-foundation-6-week.json` (18 sessions, 3×/week). Print or run the curl flow with `npm run assign:day8`.

## What M1.1 is

- **EAS prep:** `apps/mobile/eas.json` (`preview` / `development` / `production`) and Ajax bundle id `com.ajaxgym.training`. Docs for `eas login` + `eas build -p ios --profile preview`. No credentials, no required cloud build.
- **Live Supabase docs:** [docs/m1-live-supabase.md](docs/m1-live-supabase.md) — env map for API + mobile. Live `0002` + seed are already applied on the Ajax project via the ops box.
- **Assign script:** `npm run assign:day8` prints (or `--run` posts) the coach create+assign curl flow against a base URL.

## What M1.2 is

- **Dave handoff:** [docs/dave-assign-handoff.md](docs/dave-assign-handoff.md) — create from intake, assign to a roster email, verify `GET /training`. David is not required.
- **Intake mapper:** `blockFromIntake()` turns Client Summary JSON into a 6-week, 3×/week `POST /coach/blocks` body (optional `videos`).
- **Sample + script:** `fixtures/sample-intake.json` and `npm run assign:from-intake -- --email member@ajax.local --file fixtures/sample-intake.json`. Day-8 path unchanged: `fixtures/day-8-foundation-6-week.json` / `npm run assign:day8`.

## What M2.0 is

- **First-pass generator:** `generateFoundationBlock(intake)` — 18 workouts, week themes settle → load → density → strength → power-ish → settle. [docs/m2-foundation-generator.md](docs/m2-foundation-generator.md).
- **Limitation swaps:** knee / shoulder / back text on Client Summary remaps a few movements (e.g. no deep loaded lunges when a knee is mentioned).
- **Same assign path:** `blockFromIntake()` and `npm run assign:from-intake` use the generator. `--skeleton` keeps the M1.2 DEMO_BLOCK overlay. Coach API is unchanged.

## What M0 / M1 / M1.2 / M2.0 are not

Auto programming engine, wearables ingest, Apple Sign-In, Wellyx, Stripe, Grok/GLM SMS, admin audit UI, Redis, TrainingPeaks API.

Locked and not reopened: own in-app engine (later), wearables later (Apple Health + Eight Sleep first), programming fully automated with audit-only oversight (engine not in this milestone).

## Setup

Requires Node 20+.

```bash
cp .env.example .env
# Live wiring: copy apps/api/.env.example and apps/mobile/.env.example instead.
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

Sign in with `member@ajax.local` to land on the seeded 6-week block (mock mode skips that member through onboarding). Other seeded emails: `david@ajaxgym.com` (owner / coach), `seth@ajaxgym.com`, `playwright@ajax.local`. In mock mode the API does not send email; it returns a session immediately.

### Optional live path (Supabase + Postgres)

The Ajax owner project **`ajax-training-app`** exists. Live `0002_training.sql` + seed are already applied via the ops box (Foundation block assigned to `member@ajax.local`). Full env map and the service_role warning: [docs/m1-live-supabase.md](docs/m1-live-supabase.md), [docs/supabase-setup.md](docs/supabase-setup.md).

```bash
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Paste URL + anon only. Never commit `SUPABASE_SERVICE_ROLE_KEY`. If `DATABASE_URL` is set but Postgres is down, the API stays on the in-memory mock.

### Go live (public API)

Vercel hosts the Hono function (`api/index.ts` → `/health` on the production host). Checklist, env keys (no values), and smoke curls: [docs/go-live.md](docs/go-live.md). Point Expo at that origin with `EXPO_PUBLIC_API_URL` + `EXPO_PUBLIC_USE_MOCK=0`. Do not commit real keys.

### Tests

```bash
npm test
```

## M1 — create and assign a block via API

Mock mode (default, no Supabase env): start the API, then sign in as the owner and POST a block.

```bash
npm run dev:api

# 1. Mock session for Dave (owner)
TOKEN=$(curl -s http://localhost:8787/auth/magic-link \
  -H 'Content-Type: application/json' \
  -d '{"email":"david@ajaxgym.com"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['session']['accessToken'])")

# 2. Create a 6-week block
curl -s http://localhost:8787/coach/blocks \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Day-8 custom — 6 weeks",
    "notes": "First assigned block.",
    "durationWeeks": 6,
    "workouts": [
      {
        "week": 1,
        "day": 1,
        "title": "Lower body — settle the pattern",
        "notes": "Leave two reps in reserve.",
        "videoUrl": "https://www.youtube.com/watch?v=MxsSz_VZ4p4",
        "segments": [{ "name": "Goblet squat", "prescription": "3 × 8" }]
      },
      {
        "week": 1,
        "day": 3,
        "title": "Upper body — press and pull"
      }
    ]
  }'

# 3. Assign to a roster member (replaces their active block)
curl -s http://localhost:8787/coach/blocks/PROGRAM_ID/assign \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"email":"member@ajax.local"}'
```

If `COACH_API_KEY` is set on the API, Pace can skip the owner session and send the same bodies with `X-Coach-Key: $COACH_API_KEY`.

Member (auth-gated):

```bash
MEMBER=$(curl -s http://localhost:8787/auth/magic-link \
  -H 'Content-Type: application/json' \
  -d '{"email":"member@ajax.local"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['session']['accessToken'])")

curl -s http://localhost:8787/training \
  -H "Authorization: Bearer $MEMBER"

curl -s http://localhost:8787/training/workouts/WORKOUT_ID/log \
  -H "Authorization: Bearer $MEMBER" \
  -H 'Content-Type: application/json' \
  -d '{"weight":"32","reps":"8,8,8","score":"7/10","notes":"Quiet depth.","completed":true}'
```

Live path: the Ajax `ajax-training-app` project already has M0 tables plus **`0002_training.sql` + seed applied via the ops box env** (Foundation block, 18 workouts, `member@ajax.local` assigned). Re-run those files only if a new database needs the same schema — they are idempotent. Do not put connection strings or keys in this repo. Env map: [docs/m1-live-supabase.md](docs/m1-live-supabase.md) and [docs/supabase-setup.md](docs/supabase-setup.md). The API uses Postgres when `DATABASE_URL` is reachable; otherwise it stays on the in-memory mock, including the seeded demo assignment.

Print the same create+assign flow (or run it against a base URL):

```bash
npm run assign:day8
npm run assign:day8 -- --run --email member@ajax.local
```

Dave / Client Summary → assigned block (no David): [docs/dave-assign-handoff.md](docs/dave-assign-handoff.md). First-pass generator: [docs/m2-foundation-generator.md](docs/m2-foundation-generator.md).

```bash
npm run assign:from-intake -- --file fixtures/sample-intake.json --email member@ajax.local
npm run assign:from-intake -- --run --email member@ajax.local
npm run assign:from-intake -- --skeleton --print-block
```

## EAS / TestFlight (preview)

No Apple or Expo credentials live in this repo. `apps/mobile/eas.json` and `app.json` use Ajax placeholders (`com.ajaxgym.training`). A successful cloud build is **not** required for this milestone.

Once the `david@ajaxgym.com` Expo account and Apple Developer team exist:

```bash
cd apps/mobile
npm run eas:login
# or: npx eas-cli login

npx eas-cli init          # writes extra.eas.projectId — do not commit secrets
npm run eas:build:ios:preview
# or: npx eas-cli build -p ios --profile preview
```

`preview` is internal distribution. EAS will prompt for the Apple team on the human machine. Do not paste `.p8` / `.p12` / `credentials.json` into git.

Until then: Expo Go / `npm run dev:web` + the mock API.

## Repo map

```
apps/api          Hono server — health, magic-link, roster, consent, onboarding, coach blocks, training logs
apps/mobile       Expo app — login → consent → 9 sections → summary → assigned block (`eas.json` preview)
packages/shared   Onboarding, training types, intake mapper, M2 foundation generator, in-memory store
fixtures/         Day-8 Foundation body + sample Dave intake JSON
scripts/          Print/run coach create+assign (`assign-day8`, `assign:from-intake`)
docs/             [Go-live](docs/go-live.md), Supabase runbook, [Dave assign handoff](docs/dave-assign-handoff.md), [M2 generator](docs/m2-foundation-generator.md)
supabase/         Postgres + RLS for tenants, roster, programs, workouts, assignments, logs
```

## Voice

Premium, approachable, confident, warm. Ajax is Aspen strength / longevity / recovery — not gym-bro, not 24-hour.
