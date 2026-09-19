# Supabase wiring — `ajax-training-app`

M0 does not need a live project. Leave env as placeholders and use the in-memory mock.

When you are ready for Auth + Postgres, create **one** project named **`ajax-training-app`** under the Ajax Fitness owner (`davidmills88` / gym owner). Do not invent or commit real secrets in this repo.

## 1. Create the project

1. In the [Supabase dashboard](https://supabase.com/dashboard), create a project named `ajax-training-app`.
2. Open **Project Settings → API**.
3. Copy the project URL and the **anon** (public) key only.

Never paste the **service_role** key into git, Expo, or any `EXPO_PUBLIC_*` / `NEXT_PUBLIC_*` variable. Service role bypasses RLS.

## 2. Run schema + seed

From a machine that can reach the project database:

```bash
# SQL editor in the dashboard, or:
psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql
psql "$DATABASE_URL" -f supabase/migrations/0002_training.sql
psql "$DATABASE_URL" -f supabase/seed.sql
```

`0001_init.sql` creates tenants, roster, users, consents, onboarding, and RLS. `0002_training.sql` adds programs (blocks), workouts, assignments, workout_logs, and RLS. `seed.sql` adds the Ajax roster (`david@ajaxgym.com`, `seth@ajaxgym.com`, `member@ajax.local`, `playwright@ajax.local`) and assigns the demo 6-week block to `member@ajax.local`.

## 3. Paste URL + anon into env

Copy the example files, then replace placeholders with the URL and anon key from that project:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

| Variable | Where | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | `apps/api/.env` | Project URL. Magic-link OTP uses this + anon. |
| `SUPABASE_ANON_KEY` | `apps/api/.env` | Public anon key. Safe to use on the API for Auth OTP. |
| `DATABASE_URL` | `apps/api/.env` | Postgres connection string. Required for the live store. |
| `SUPABASE_SERVICE_ROLE_KEY` | `apps/api/.env` only | Server-only. Flips `runtimeMode()` to live. **Never commit.** |
| `EXPO_PUBLIC_SUPABASE_URL` | `apps/mobile/.env` | Same project URL (client prefix). |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `apps/mobile/.env` | Same anon key. Set `EXPO_PUBLIC_USE_MOCK=0` for live. |

There is no Next.js app in this monorepo. If one is added later, use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` with the same URL + anon placeholders — never service_role.

`.env` is gitignored. Keep `.env.example` as labeled placeholders only.

## 4. Auth setting

Enable email magic links in Supabase Auth. Apple Sign-In stays stubbed until the `david@ajaxgym.com` Apple Developer team exists.

If `DATABASE_URL` is set but Postgres is unreachable, the API logs a warning and stays on the in-memory mock.

M1 training tables, env table, and the Day-8 assign script: [m1-live-supabase.md](./m1-live-supabase.md).
