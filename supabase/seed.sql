-- Manual Ajax member roster for M0 (no Wellyx gate).
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
  'Ajax Foundation — 6 weeks',
  'A first custom block: three sessions a week, strength plus easy aerobic work. Load only when the movement stays quiet and controlled.',
  6
)
on conflict (id) do update
  set title = excluded.title,
      notes = excluded.notes,
      duration_weeks = excluded.duration_weeks;

insert into public.workouts (tenant_id, program_id, week, day, sort_order, title, notes, video_url, segments)
values
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 1, 1, 0, 'Lower body — settle the pattern',
   'Find depth and a still torso before you chase load. Leave two reps in reserve.',
   'https://www.youtube.com/watch?v=MxsSz_VZ4p4',
   '[{"name":"Goblet squat","prescription":"3 × 8","notes":"Pause one breath at the bottom.","videoUrl":"https://www.youtube.com/watch?v=MxsSz_VZ4p4"},{"name":"Romanian deadlift","prescription":"3 × 6","notes":"Soft knees, long spine."},{"name":"Calf raise","prescription":"2 × 12"}]'::jsonb),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 1, 3, 1, 'Upper body — press and pull',
   'Even tempo. Stop the set when the shoulder shrug starts to take over.',
   null,
   '[{"name":"Dumbbell bench press","prescription":"3 × 8"},{"name":"Chest-supported row","prescription":"3 × 8"},{"name":"Half-kneeling press","prescription":"2 × 8 / side"}]'::jsonb),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 1, 5, 2, 'Easy aerobic + mobility',
   'Conversational pace. This is recovery you can still feel proud of.',
   'https://www.youtube.com/watch?v=L_xrDAtykMI',
   '[{"name":"Zone 2","prescription":"30–40 min walk, bike, or ski-erg"},{"name":"Hip 90/90","prescription":"2 × 45s / side"}]'::jsonb),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 2, 1, 3, 'Lower body — add a little load',
   'Same patterns as week 1. A small jump in weight is enough.',
   null,
   '[{"name":"Goblet squat","prescription":"3 × 8"},{"name":"Romanian deadlift","prescription":"3 × 6"},{"name":"Split squat","prescription":"2 × 8 / side"}]'::jsonb),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 2, 3, 4, 'Upper body — clean positions',
   'Keep the ribs stacked. Do not chase a pump.',
   null,
   '[{"name":"Dumbbell bench press","prescription":"3 × 8"},{"name":"Chest-supported row","prescription":"3 × 10"},{"name":"Face pull","prescription":"2 × 12"}]'::jsonb),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 2, 5, 5, 'Easy aerobic + walk-out',
   'Same zone 2 as week 1. Finish with unhurried breathing.',
   null,
   '[{"name":"Zone 2","prescription":"35–45 min"},{"name":"Couch stretch","prescription":"2 × 40s / side"}]'::jsonb),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 3, 1, 6, 'Lower body — density',
   'Shorter rests if the last set still looks like the first.',
   null,
   '[{"name":"Front-loaded squat","prescription":"4 × 6"},{"name":"Hip hinge","prescription":"3 × 6"},{"name":"Calf raise","prescription":"3 × 10"}]'::jsonb),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 3, 3, 7, 'Upper body — denser sets',
   'One extra working set. Form still wins.',
   null,
   '[{"name":"Dumbbell bench press","prescription":"4 × 6"},{"name":"Single-arm row","prescription":"3 × 8 / side"},{"name":"Half-kneeling press","prescription":"3 × 6 / side"}]'::jsonb),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 3, 5, 8, 'Aerobic — slightly longer',
   'Stay conversational. If you cannot speak a sentence, ease off.',
   null,
   '[{"name":"Zone 2","prescription":"40–50 min"},{"name":"World''s greatest stretch","prescription":"2 / side"}]'::jsonb),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 4, 1, 9, 'Lower body — strength emphasis',
   'Top sets at a true 7/10 effort. No grinding.',
   null,
   '[{"name":"Squat pattern","prescription":"4 × 5"},{"name":"Romanian deadlift","prescription":"3 × 5"},{"name":"Cossack squat","prescription":"2 × 6 / side"}]'::jsonb),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 4, 3, 10, 'Upper body — strength emphasis',
   'Pause the last rep of each set on the chest or at the hang.',
   null,
   '[{"name":"Press","prescription":"4 × 5"},{"name":"Row","prescription":"4 × 6"},{"name":"Carry","prescription":"2 × 30m"}]'::jsonb),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 4, 5, 11, 'Easy aerobic — keep the week honest',
   'Do not turn this into intervals.',
   null,
   '[{"name":"Zone 2","prescription":"40 min"},{"name":"Ankle rocks","prescription":"2 × 10 / side"}]'::jsonb),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 5, 1, 12, 'Lower body — power without chaos',
   'Crisp reps. Stop before the landing gets loud.',
   null,
   '[{"name":"Squat pattern","prescription":"3 × 5"},{"name":"Box step-up","prescription":"3 × 5 / side"},{"name":"Broad jump (soft)","prescription":"3 × 3"}]'::jsonb),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 5, 3, 13, 'Upper body — press, pull, carry',
   'A little more snap, same control.',
   null,
   '[{"name":"Press","prescription":"3 × 5"},{"name":"Row","prescription":"3 × 6"},{"name":"Farmer carry","prescription":"3 × 30m"}]'::jsonb),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 5, 5, 14, 'Aerobic — steady',
   'Same easy pace. This week is about arriving recovered.',
   null,
   '[{"name":"Zone 2","prescription":"40–45 min"},{"name":"Breathing reset","prescription":"5 min nasal, slow"}]'::jsonb),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 6, 1, 15, 'Lower body — settle and note',
   'Repeat a week-4 load if it still feels quiet. Write down what moved well.',
   null,
   '[{"name":"Squat pattern","prescription":"3 × 5"},{"name":"Hinge","prescription":"3 × 5"},{"name":"Calf raise","prescription":"2 × 12"}]'::jsonb),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 6, 3, 16, 'Upper body — settle and note',
   'Same idea as Tuesday. This is a checkpoint, not a test day.',
   null,
   '[{"name":"Press","prescription":"3 × 5"},{"name":"Row","prescription":"3 × 6"},{"name":"Carry","prescription":"2 × 30m"}]'::jsonb),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 6, 5, 17, 'Easy finish',
   'Walk, breathe, write a short note for your coach. The next block starts from here.',
   null,
   '[{"name":"Zone 2","prescription":"30–40 min"},{"name":"Full-body mobility","prescription":"8–10 min"}]'::jsonb)
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
