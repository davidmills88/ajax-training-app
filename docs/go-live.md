# Go live — public API + mobile → live Supabase

Ship the Hono API on Vercel and point Expo at that origin plus the existing `ajax-training-app` Supabase project. **This PR does not deploy for you** (no Vercel token in CI / this agent). After merge, Pace sets Vercel env from the ops box and deploys.

Out of scope here: EAS / TestFlight, Apple Sign-In, Day-8 SMS, Dave auto-assign changes, Wellyx.

No secrets belong in git. Copy keys from the ops box file pattern `/workspace/ajax-training-app.env` (or the same names in `apps/api/.env`) — **values stay on the ops box / Vercel only**.

## 1. Create the Vercel project

1. In [Vercel](https://vercel.com) → **Add New → Project** → import `davidmills88/ajax-training-app`.
2. **Framework Preset: Other (required in the dashboard).** Do **not** pick Hono (or any frontend). The Hono preset made production fail with `STATIC_BUILD_NO_OUT_DIR` (Vercel looks for a static `public/` folder). Auto-detect / Hono would also use `apps/api/src/index.ts` (`serve()`), not the serverless entry. Repo `vercel.json` sets `"framework": null` (Other), but a dashboard Hono value may persist — **null cannot be reliably PATCHed via API**, so a human must set this in **Project Settings → General → Build & Development → Framework Preset → Other**.
3. **Root Directory:** leave the repository root (uses root `vercel.json` + `api/index.ts`).
   - Alternative: set Root Directory to `apps/api` (uses `apps/api/vercel.json` + `apps/api/api/index.ts`). Same function either way.
4. **Node.js:** 20.x (repo `engines`).
5. **Build & Output:** API-only. `vercel.json` sets `"buildCommand": null` and `"outputDirectory": null` so Vercel does **not** run a static build. A typecheck-only Build Command (`npm run typecheck -w @ajax/shared && …`) is what made Vercel expect `public/` after the build. Install stays `npm ci`. Typecheck is local / CI (`npm run typecheck`), not the Vercel build.
   - If **Override** is on for Build Command or Output Directory, leave both fields **empty** (or turn Override off). Do not set Output Directory to `public`. Do not add an empty `public/` folder.
6. The rewrite sends every path to the Node function (`api/index.ts` → `@hono/node-server/vercel` + `pg`) so `GET /health` is `/health` on the host, not `/api/health`. Root `package.json` is `"type": "module"` and `api/index.ts` is a real ESM handler (not a CJS re-export into `@ajax/api`). That avoids `ERR_REQUIRE_ESM` / `FUNCTION_INVOCATION_FAILED` on `GET /health`.

A first deploy can still return mock `mode` until env is set — that is expected if you want a green health check against live Postgres. The deploy itself should succeed without a static output directory.

## 2. Vercel env vars (keys only)

Paste from the ops box `ajax-training-app.env` (or `apps/api/.env` on that machine). **Production** (and Preview if you want Pace smoke on PR URLs).

| Key | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Prefer the Supabase **transaction pooler** (`*.pooler.supabase.com:6543`) for serverless. Direct `db.<ref>.supabase.co:5432` also works. |
| `SUPABASE_URL` | Yes | Project URL (`https://<ref>.supabase.co`). |
| `SUPABASE_ANON_KEY` | Yes | Public anon key. Magic-link OTP. |
| `COACH_API_KEY` | Yes for Pace assign | Header `X-Coach-Key` for `assign:from-intake` against live Auth. |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Server-only. Flips `runtimeMode()` to live even without a reachable DB. **Never** put this on Expo. |
| `DATABASE_SSL` | Optional | Unset: auto `{ rejectUnauthorized: false }` on Supabase / pooler hosts. `0` only for local TLS-off Postgres. Do **not** set `NODE_TLS_REJECT_UNAUTHORIZED=0`. |
| `CORS_ORIGINS` | Optional | Extra browser origins, comma-separated. Unset stays permissive. Expo web (`localhost:8081`), LAN, `*.expo.dev`, `*.vercel.app`, `*.ajaxgym.com` are always allowed. |
| `AJAX_TENANT_SLUG` | Optional | Defaults to `ajax`. |
| `PORT` | No | Vercel sets this. |

Never add `EXPO_PUBLIC_*` or `SUPABASE_SERVICE_ROLE_KEY` as a *client* env on Vercel. Mobile env is local / EAS, not this function.

## 3. Deploy

Dashboard **Deploy**, or from a machine with `vercel` logged in as the Ajax owner:

```bash
npx vercel link          # scope: Ajax / davidmills88
npx vercel --prod
```

Copy the production URL (`https://<project>.vercel.app`).

## 4. Smoke (production URL)

Replace `https://YOUR-API` with the Vercel origin. No trailing slash.

```bash
# Health — must be 200 { ok: true, service: "ajax-api", ... }
curl -sS https://YOUR-API/health

# CORS preflight for Expo web
curl -sS -D- -o /dev/null -X OPTIONS https://YOUR-API/health \
  -H 'Origin: http://localhost:8081' \
  -H 'Access-Control-Request-Method: GET'
```

**Magic-link (mock-or-OTP):** if `DATABASE_URL` is reachable, mode is `live` and `POST /auth/magic-link` sends a Supabase OTP (no session in the JSON). If Postgres is down, the function falls back to memory and returns a mock session for roster emails.

```bash
curl -sS https://YOUR-API/auth/magic-link \
  -H 'Content-Type: application/json' \
  -d '{"email":"member@ajax.local"}'
```

**Assign + training** (needs `COACH_API_KEY` on Vercel and in this shell):

```bash
export AJAX_API_URL=https://YOUR-API
export COACH_API_KEY=…          # same value as Vercel — not committed
npm run assign:from-intake -- --run --email member@ajax.local --file fixtures/sample-intake.json
```

That script POSTs `/coach/blocks`, assigns, then `GET /training`. Use a roster email. Live Auth does not return a mock session; the script uses `X-Coach-Key` when `COACH_API_KEY` is set.

Manual `GET /training` after a member OTP (paste the access token from Supabase / the app):

```bash
curl -sS https://YOUR-API/training -H "Authorization: Bearer $MEMBER_TOKEN"
```

## 5. Mobile live wiring

`apps/mobile/app.config.js` reads:

| Variable | Live value |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | Vercel origin from step 3 |
| `EXPO_PUBLIC_SUPABASE_URL` | Same project URL as the API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same anon key |
| `EXPO_PUBLIC_USE_MOCK` | `0` |

```bash
cp apps/mobile/.env.example apps/mobile/.env
# edit: API URL + USE_MOCK=0 + URL/anon from ops box
npm run dev:mobile
# or: npm run dev:web
```

Do not commit `apps/mobile/.env`. Placeholders stay in `.env.example`. Expo Go / web against the live API is enough — **no TestFlight / EAS build in this milestone**.

## 6. What Pace must set on Vercel after merge

If this agent could not run `vercel --prod` (no `VERCEL_TOKEN`):

1. Import the repo (or reconnect if a project already exists).
2. **Dashboard (code cannot clear this):** Framework Preset = **Other**, not Hono. See §1 step 2. This is the toggle that must still be flipped if the project object still reports `framework: hono`.
3. Root Directory = repository root **or** `apps/api` (see §1).
4. Confirm Build Command and Output Directory are empty (no `public`). See §1 step 5 if a prior deploy failed with `STATIC_BUILD_NO_OUT_DIR`.
5. Env keys already used on this project (do not rename): `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `COACH_API_KEY` (plus optional keys in §2). Paste values from `/workspace/ajax-training-app.env` — not the file contents into git.
6. Deploy production (Dashboard **Deploy** or `npx vercel --prod` after `vercel link`).
7. Confirm `GET https://<prod>/health` → `ok: true` and `mode` is `live` when the pooler URL works.
8. Tell David the production URL so `EXPO_PUBLIC_API_URL` can be set on the device / Expo start.

Schema + seed on `ajax-training-app` are already applied (ops box). See [m1-live-supabase.md](./m1-live-supabase.md).
