# M1.1 — live Supabase path

M1 already shipped the training tables and coach API. This is the human checklist to point a deployed (or local) API + mobile app at a real `ajax-training-app` project. **Mock fallback stays the default** if these env vars are blank or Postgres is unreachable.

No secrets belong in git. Copy `.env.example` files locally.

## 1. Project

In the [Supabase dashboard](https://supabase.com/dashboard), create or open the project named **`ajax-training-app`** under the Ajax Fitness owner. Copy the project URL and **anon** key from **Project Settings → API**. Never put the **service_role** key in Expo, `EXPO_PUBLIC_*`, or this repo.

Enable email magic links in **Authentication**. Apple Sign-In stays stubbed.

## 2. Apply migrations + seed (safe to re-run)

Both SQL files are written to be re-runnable:

- `0001_init.sql` / `0002_training.sql`: `create table/index if not exists`, `create or replace function`, `drop policy if exists` then `create policy`.
- `seed.sql`: `on conflict` upserts for roster, the demo Foundation block, and the `member@ajax.local` assignment.

```bash
# Dashboard SQL editor, or any machine that can reach the project:
psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql
psql "$DATABASE_URL" -f supabase/migrations/0002_training.sql
psql "$DATABASE_URL" -f supabase/seed.sql
```

`0002_training.sql` adds `programs`, `workouts`, `program_assignments`, `workout_logs`, plus coach/member RLS. It does not drop member data.

## 3. Env vars

```bash
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

| Variable | App | Required for live? |
| --- | --- | --- |
| `DATABASE_URL` | API | Yes — Postgres store. If set but unreachable, API stays on the in-memory mock. |
| `SUPABASE_URL` | API | Yes — magic-link OTP. |
| `SUPABASE_ANON_KEY` | API | Yes — public anon key for OTP. |
| `SUPABASE_SERVICE_ROLE_KEY` | API only | Flips `runtimeMode()` to live. **Server-only. Never commit.** |
| `COACH_API_KEY` | API | Optional. When set, Pace can `POST /coach/blocks` with `X-Coach-Key` (needed for the assign script against live Auth). |
| `AJAX_TENANT_SLUG` | API | Defaults to `ajax`. |
| `PORT` | API | Defaults to `8787`. |
| `EXPO_PUBLIC_API_URL` | Mobile | Live API origin (not `localhost` on a device). |
| `EXPO_PUBLIC_USE_MOCK` | Mobile | `0` for live. |
| `EXPO_PUBLIC_SUPABASE_URL` | Mobile | Same project URL. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Mobile | Same anon key. |

See [supabase-setup.md](./supabase-setup.md) for the service_role warning.

## 4. Assign the Day 8 Foundation fixture

`fixtures/day-8-foundation-6-week.json` is a `POST /coach/blocks` body: 6 weeks, 3×/week (days 1 / 3 / 5), optional placeholder video URLs.

Print the curl flow (default):

```bash
npm run assign:day8
# or: npm run assign:day8 -- --base-url https://YOUR-API --email member@ajax.local
```

Run it against a mock API (magic-link returns a session):

```bash
npm run dev:api
npm run assign:day8 -- --run
```

Run it against a live API (set the same `COACH_API_KEY` the server has):

```bash
export AJAX_API_URL=https://YOUR-API
export COACH_API_KEY=…          # not committed
npm run assign:day8 -- --run --email member@ajax.local
```

That replaces the member's active block. Seeded `Ajax Foundation — 6 weeks` remains in the database as an inactive assignment.

## 5. What still needs a human

- Create the Supabase project and paste URL / anon / `DATABASE_URL` / service_role into local or host env (Vercel / Fly).
- Run the three SQL files once (re-running is safe).
- Set `COACH_API_KEY` if Pace should assign without a magic-link session.
- Point `EXPO_PUBLIC_API_URL` at the deployed API before a device / TestFlight build.

Not required here: Apple Developer, EAS cloud build, Apple Sign-In, Wellyx, SMS, Stripe.
