# M2.0 — first-pass Foundation generator

Thin auto block from Client Summary / Dave intake. **Not** a full programming engine: no wearables, no readiness, no auto-progression from logs.

`generateFoundationBlock(intake)` in `packages/shared/src/foundation-block.ts` returns a `CreateBlockInput` for the existing coach API. Dave / Pace call `POST /coach/assign-from-intake` (or `POST /coach/blocks` + assign).

## What it emits

- Always **6 weeks × sessions on days 1 / 3 / 5** (18 workouts).
- Week themes: **settle → load → density → strength → power-ish → settle**.
- Program notes always include **`M2 first pass — coach may swap`**.
- Goals, limitations, equipment, and availability are written onto program notes, per-session notes, and segment prescriptions (shorter sets for ~30 min, extra set for 75+).
- Optional `videos.lower` / `upper` / `aerobic` (or `videoUrl`) attach at **session** level; otherwise a slot placeholder.
- Every segment also gets its own movement `videoUrl` from the shared catalog (`movement-videos.ts`). Intake slot URLs do not replace per-exercise clips. Newly generated blocks stamp both.

## Limitation swaps (simple)

Detected from `limitationsInjuries` text:

| Mention | Typical swaps |
| --- | --- |
| Knee / lunge | No deep loaded lunges, split squat, Cossack, box step-up, or jumps → high-box sit-to-stand, glute bridge, lateral band walk, med-ball pass |
| Shoulder | No overhead / deep-stretch press → floor press, chest-height landmine or band press, suitcase carry |
| Back | Supported hinge, chest-supported row, no jump / loaded twist |

Equipment (`limited` / `home` / mixed travel) only remaps kit after safety swaps. Availability never changes the 3×/week skeleton.

## Same assign path

```bash
# Dave after Client Summary (preferred HTTP)
curl -sS "${AJAX_API_URL:-https://ajax-training-app.vercel.app}/coach/assign-from-intake" \
  -H "X-Coach-Key: $COACH_API_KEY" \
  -H 'Content-Type: application/json' \
  --data-binary @fixtures/sample-intake.json

npm run assign:from-intake -- --file fixtures/sample-intake.json --email member@ajax.local
npm run assign:from-intake -- --run --email member@ajax.local
npm run -s assign:from-intake -- --print-block --file fixtures/sample-intake.json
```

M1.2 DEMO_BLOCK overlay (no swaps, no week-theme generation):

```bash
npm run assign:from-intake -- --skeleton --print-block --file fixtures/sample-intake.json
```

Handoff curl and auth: [dave-assign-handoff.md](./dave-assign-handoff.md). Coach or `X-Coach-Key` can still edit/replace any session after create.

## Out of scope

Wearables, readiness, auto progression from logs, Grok/SMS, Apple Sign-In, Wellyx, Stripe, admin UI, EAS build.
