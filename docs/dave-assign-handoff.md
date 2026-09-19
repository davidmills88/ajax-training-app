# M1.2 — Dave → assign handoff

Dave (Ajax PT bot) already has the member intake / Client Summary. After that summary is ready, Pace should turn it into an assigned 6-week block the member sees in-app **without David**. This is a thin handoff — not an auto-programming engine.

No secrets belong in git. Do not paste `COACH_API_KEY`, Supabase keys, or connection strings here. No Day-8 member SMS/email. No TestFlight.

## What Dave does after Client Summary

One authenticated POST. That is the whole assign path.

**Env (names only — values live on the ops box / Vercel / Dave runtime, never in git):**

| Name | Who has it | Role |
| --- | --- | --- |
| `COACH_API_KEY` | Vercel API + Dave | Same value. Header `X-Coach-Key`. |
| `AJAX_API_URL` | Dave (optional) | API origin. Production default: `https://ajax-training-app.vercel.app` |

**Dave one-liner (preferred):**

```bash
# After Client Summary JSON is ready. Replaces the member's active block.
# $COACH_API_KEY must match the API. Do not echo or commit it.
curl -sS "${AJAX_API_URL:-https://ajax-training-app.vercel.app}/coach/assign-from-intake" \
  -H "X-Coach-Key: $COACH_API_KEY" \
  -H 'Content-Type: application/json' \
  --data-binary @/path/to/client-summary.json
```

`client-summary.json` may be the flat Client Summary (same keys as [`fixtures/sample-intake.json`](../fixtures/sample-intake.json)) or a wrapper:

```json
{
  "email": "member@ajax.local",
  "skeleton": false,
  "intake": { "name": "…", "goals": "…", "limitationsInjuries": "…" }
}
```

Expect `201` with `program`, `workouts` (18), `assignment.status` `active`. Unknown roster emails are `400` / `not_on_roster`. A wrong `X-Coach-Key` is `401`. Members cannot call this.

This route **does not** send SMS, email, or a magic link. After assign, mint a member session with `POST /auth/coach-session` (same `X-Coach-Key`) and `GET /training`. Live magic-link OTP is often rate-limited — do not retry assign because of OTP. See [go-live.md — Demo the app](./go-live.md#7-demo-the-app-no-email-otp).

**Equivalent npm (ops box / local):**

```bash
export AJAX_API_URL=https://ajax-training-app.vercel.app
export COACH_API_KEY=…          # not committed
npm run assign:from-intake -- --run --email member@ajax.local --file fixtures/sample-intake.json
```

`--run` POSTs `/coach/assign-from-intake`, then verifies `GET /training`. When `COACH_API_KEY` is set it mints `POST /auth/coach-session` (no email). If that route is not deployed yet, it falls back to magic-link; `otp_failed` prints a warning and **exits 0**.

## What you need

| Piece | Where |
| --- | --- |
| Intake JSON | Client Summary fields + optional `email` / `videos`. Schema below. Sample: [`fixtures/sample-intake.json`](../fixtures/sample-intake.json) |
| Mapper | `blockFromIntake()` → `generateFoundationBlock()` ([m2-foundation-generator.md](./m2-foundation-generator.md)) → valid `POST /coach/blocks` body. `--skeleton` keeps the M1.2 overlay. |
| HTTP (Dave) | `POST /coach/assign-from-intake` — create + assign in one call |
| Script | `npm run assign:from-intake` |
| Day-8 fixture (no intake) | [`fixtures/day-8-foundation-6-week.json`](../fixtures/day-8-foundation-6-week.json) + `npm run assign:day8` |
| Auth | Owner session `david@ajaxgym.com` **or** `X-Coach-Key` when `COACH_API_KEY` is set on the API |

Seeded roster emails: `david@ajaxgym.com` (owner), `seth@ajaxgym.com`, `member@ajax.local`, `playwright@ajax.local`.

## Mock vs live

**Mock (default).** No Supabase env. `npm run dev:api` uses the in-memory store. `POST /auth/magic-link` returns a session immediately. `member@ajax.local` is already assigned the seeded **Ajax Foundation — 6 weeks** block (onboarding complete). Create+assign replaces that active assignment; the seed program stays as an inactive row.

**Live.** Production API: `https://ajax-training-app.vercel.app` (`GET /health` → `ok: true`, `mode: live`). The Ajax `ajax-training-app` project already has M0 tables + `0002_training.sql` + seed (Foundation block assigned to `member@ajax.local`). Magic-link does **not** return a session — set the same `COACH_API_KEY` on the API and in the shell, and send `X-Coach-Key`. Env map: [m1-live-supabase.md](./m1-live-supabase.md), [go-live.md](./go-live.md). Never commit keys.

## Intake schema

Dave can POST or save a JSON object. Client Summary keys match onboarding (`buildClientSummary` / the member-editable summary). Extra keys are handoff-only.

```json
{
  "email": "member@ajax.local",
  "name": "Demo Member",
  "ageGender": "38 / woman",
  "goals": "Ski-season durability · Quiet strength — Stay on snow without blowing up.",
  "trainingAvailability": "3 days/week · About 60 minutes · Morning",
  "equipmentAccess": "Ajax gym access",
  "limitationsInjuries": "Old left knee sprain. Avoid deep loaded lunges if it chatters.",
  "strengthsWeaknesses": "Consistent walker. Hinge pattern needs coaching.",
  "recoveryNutritionNotes": "Sleep: 7 hours · Stress: Moderate · Nutrition: Intuitive",
  "coachingPreferences": "Longevity-focused · Structured templates · Brief summary",
  "title": "optional override — default is '{name} — 6 weeks'",
  "notes": "optional extra coach note appended to the block",
  "videos": {
    "lower": "https://example.com/lower",
    "upper": "https://example.com/upper",
    "aerobic": "https://example.com/aerobic",
    "default": "https://example.com/form"
  }
}
```

| Field | Required? | Notes |
| --- | --- | --- |
| `name` or `goals` or `title` | one of these | So the block can be labeled |
| Client Summary keys | useful | Copied into block + per-session notes. Availability does **not** change the 3×/week skeleton. |
| `email` / `memberEmail` | required on the HTTP call | Script `--email` wins when both are set |
| `clientSummary` | optional | Nested onboarding export; top-level keys win |
| `videos.*` / `videoUrl` | optional | http(s) only. Slots: day 1 lower, day 3 upper, day 5 aerobic |
| `skeleton` | optional | `true` uses the M1.2 DEMO_BLOCK overlay instead of the M2 generator |

The mapper always emits **6 weeks × 3 sessions (days 1 / 3 / 5)**. Default is the M2 first-pass generator (week themes + simple limitation swaps). Goals, limitations, equipment, and availability are written onto the program and workouts. Program notes include `M2 first pass — coach may swap`. This is still a first-pass block, not a full engine.

Print the mapped body without calling the API (`-s` hides the npm banner so the output is valid JSON):

```bash
npm run -s assign:from-intake -- --print-block --file fixtures/sample-intake.json
```

## One command (script)

```bash
# Print Dave curl (default)
npm run assign:from-intake
npm run assign:from-intake -- --file fixtures/sample-intake.json --email member@ajax.local

# Mock: start API, then create + assign (+ optional GET /training)
npm run dev:api
npm run assign:from-intake -- --run --email member@ajax.local --file fixtures/sample-intake.json

# Live: same COACH_API_KEY the server has — do not commit it
export AJAX_API_URL=https://ajax-training-app.vercel.app
export COACH_API_KEY=…          # not committed
npm run assign:from-intake -- --run --email member@ajax.local --file fixtures/sample-intake.json
```

`--run` replaces the member's active block. If `POST /coach/assign-from-intake` is not deployed yet (404), the script falls back to `POST /coach/blocks` + assign.

## Exact curl (legacy a → b → c)

Use this only if the one-shot route is unavailable. Base URL `http://localhost:8787` below. Swap the origin for a deployed API.

### Auth

Mock owner session:

```bash
TOKEN=$(curl -sS http://localhost:8787/auth/magic-link \
  -H 'Content-Type: application/json' \
  -d '{"email":"david@ajaxgym.com"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['session']['accessToken'])")
```

Or Pace / Dave with a configured key (live or mock):

```bash
# header on every coach request:
# -H "X-Coach-Key: $COACH_API_KEY"
```

A wrong `X-Coach-Key` when `COACH_API_KEY` is set returns `401`. Members cannot create or assign.

### (a) Create block from intake JSON

```bash
npm run assign:from-intake -- --print-block --file fixtures/sample-intake.json > /tmp/ajax-intake-block.json

PROGRAM_ID=$(curl -sS http://localhost:8787/coach/blocks \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  --data-binary @/tmp/ajax-intake-block.json | python3 -c "import sys,json; print(json.load(sys.stdin)['program']['id'])")
```

With a coach key, drop `Authorization` and send `X-Coach-Key` instead.

### (b) Assign to a roster email

```bash
curl -sS http://localhost:8787/coach/blocks/$PROGRAM_ID/assign \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"email":"member@ajax.local"}'
```

Unknown emails return `400` / `not_on_roster`. This replaces the member's active assignment.

### (c) Verify member `GET /training` (optional)

```bash
# Live (or mock): coach-gated demo session — no email
MEMBER=$(curl -sS http://localhost:8787/auth/coach-session \
  -H 'Content-Type: application/json' \
  -H "X-Coach-Key: $COACH_API_KEY" \
  -d '{"email":"member@ajax.local"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['session']['accessToken'])")

# Mock only: magic-link returns a session immediately
# MEMBER=$(curl -sS http://localhost:8787/auth/magic-link \
#   -H 'Content-Type: application/json' \
#   -d '{"email":"member@ajax.local"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['session']['accessToken'])")

curl -sS http://localhost:8787/training \
  -H "Authorization: Bearer $MEMBER"
```

Expect `program.title` like `Demo Member — 6 weeks`, `workouts.length` `18`, `assignment.status` `active`. Live magic-link will not return `MEMBER` — use `/auth/coach-session`. Do not treat OTP failure as an assign failure.

## Day-8 fixture (no intake)

If Dave does not have a Client Summary yet, assign the canned Foundation body:

```bash
npm run assign:day8
npm run assign:day8 -- --run --email member@ajax.local
```

Fixture path: `fixtures/day-8-foundation-6-week.json` (already a `POST /coach/blocks` body). Live DB already has this seed as **Ajax Foundation — 6 weeks** for `member@ajax.local`; `--run` assigns a new active row and leaves the seed inactive.

## Out of scope

Auto programming engine, wearables, Apple Sign-In, Wellyx, SMS/GLM, Stripe, EAS cloud build, admin UI.
