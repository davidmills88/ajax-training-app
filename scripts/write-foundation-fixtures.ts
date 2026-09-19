#!/usr/bin/env npx tsx
/**
 * Rewrite Day-8 JSON + seed workout rows from the shared foundation builder.
 * Run after changing templates: npx tsx scripts/write-foundation-fixtures.ts
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DAY8_FOUNDATION_BLOCK, DEMO_BLOCK } from "../packages/shared/src/demo-block.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

writeFileSync(
  resolve(ROOT, "fixtures/day-8-foundation-6-week.json"),
  `${JSON.stringify(DAY8_FOUNDATION_BLOCK, null, 2)}\n`,
);

const values = DEMO_BLOCK.workouts
  .map((workout, index) => {
    const segments = JSON.stringify(workout.segments ?? []).replace(/'/g, "''");
    const notes = (workout.notes ?? "").replace(/'/g, "''");
    const title = workout.title.replace(/'/g, "''");
    const video = workout.videoUrl ? `'${workout.videoUrl.replace(/'/g, "''")}'` : "null";
    return `  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', ${workout.week}, ${workout.day}, ${workout.sortOrder ?? index}, '${title}',
   '${notes}',
   ${video},
   '${segments}'::jsonb)`;
  })
  .join(",\n");

const seed = `-- Manual Ajax member roster for M0 (no Wellyx gate).
insert into public.member_roster (tenant_id, email, full_name, status)
values
  ('11111111-1111-1111-1111-111111111111', 'david@ajaxgym.com', 'David Mills', 'active'),
  ('11111111-1111-1111-1111-111111111111', 'seth@ajaxgym.com', 'Seth', 'active'),
  ('11111111-1111-1111-1111-111111111111', 'member@ajax.local', 'Demo Member', 'active'),
  ('11111111-1111-1111-1111-111111111111', 'playwright@ajax.local', 'Playwright Guest', 'active')
on conflict (tenant_id, email) do update
  set full_name = excluded.full_name,
      status = excluded.status;

-- M1 demo block assigned to member@ajax.local (matches InMemoryAjaxStore seed).
insert into public.programs (id, tenant_id, title, notes, duration_weeks)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  '${DEMO_BLOCK.title.replace(/'/g, "''")}',
  '${(DEMO_BLOCK.notes ?? "").replace(/'/g, "''")}',
  ${DEMO_BLOCK.durationWeeks ?? 6}
)
on conflict (id) do update
  set title = excluded.title,
      notes = excluded.notes,
      duration_weeks = excluded.duration_weeks;

insert into public.workouts (tenant_id, program_id, week, day, sort_order, title, notes, video_url, segments)
values
${values}
on conflict (program_id, week, day, sort_order) do update
  set title = excluded.title,
      notes = excluded.notes,
      video_url = excluded.video_url,
      segments = excluded.segments;

insert into public.program_assignments (id, tenant_id, program_id, member_email, status)
values (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'member@ajax.local',
  'active'
)
on conflict (id) do update
  set program_id = excluded.program_id,
      member_email = excluded.member_email,
      status = excluded.status;
`;

writeFileSync(resolve(ROOT, "supabase/seed.sql"), seed);
console.log(
  `Wrote Day-8 fixture + seed (${DAY8_FOUNDATION_BLOCK.workouts.length} workouts, ${DAY8_FOUNDATION_BLOCK.workouts.reduce((n, w) => n + (w.segments?.length ?? 0), 0)} segments).`,
);
