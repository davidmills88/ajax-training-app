-- Ajax Training M1 — assigned blocks, workouts, result logs
-- Apply after 0001_init.sql:
--   psql "$DATABASE_URL" -f supabase/migrations/0002_training.sql

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  title text not null,
  notes text not null default '',
  duration_weeks int not null default 6 check (duration_weeks between 1 and 12),
  created_at timestamptz not null default now()
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  program_id uuid not null references public.programs (id) on delete cascade,
  week int not null check (week >= 1),
  day int not null check (day between 1 and 7),
  sort_order int not null default 0,
  title text not null,
  notes text not null default '',
  video_url text,
  segments jsonb not null default '[]'::jsonb,
  unique (program_id, week, day, sort_order)
);

create table if not exists public.program_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  program_id uuid not null references public.programs (id) on delete cascade,
  member_email text not null,
  user_id uuid references public.app_users (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  assigned_at timestamptz not null default now()
);

create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  user_id uuid not null references public.app_users (id) on delete cascade,
  workout_id uuid not null references public.workouts (id) on delete cascade,
  assignment_id uuid not null references public.program_assignments (id) on delete cascade,
  weight text,
  reps text,
  score text,
  notes text not null default '',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id, workout_id, assignment_id)
);

create index if not exists programs_tenant_idx on public.programs (tenant_id, created_at);
create index if not exists workouts_program_idx on public.workouts (tenant_id, program_id, week, day, sort_order);
create index if not exists assignments_member_idx on public.program_assignments (tenant_id, member_email, status);
create index if not exists workout_logs_user_idx on public.workout_logs (tenant_id, user_id, workout_id);

alter table public.programs enable row level security;
alter table public.workouts enable row level security;
alter table public.program_assignments enable row level security;
alter table public.workout_logs enable row level security;

create or replace function public.is_tenant_coach()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.app_users u
    where u.id = auth.uid()
      and u.tenant_id = public.current_tenant_id()
      and u.role in ('owner', 'auditor')
  )
$$;

drop policy if exists programs_coach on public.programs;
create policy programs_coach on public.programs
  for all using (tenant_id = public.current_tenant_id() and public.is_tenant_coach())
  with check (tenant_id = public.current_tenant_id() and public.is_tenant_coach());

drop policy if exists programs_member_select on public.programs;
create policy programs_member_select on public.programs
  for select using (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1
      from public.program_assignments a
      where a.program_id = programs.id
        and a.tenant_id = programs.tenant_id
        and a.status = 'active'
        and a.member_email = (select email from public.app_users where id = auth.uid())
    )
  );

drop policy if exists workouts_coach on public.workouts;
create policy workouts_coach on public.workouts
  for all using (tenant_id = public.current_tenant_id() and public.is_tenant_coach())
  with check (tenant_id = public.current_tenant_id() and public.is_tenant_coach());

drop policy if exists workouts_member_select on public.workouts;
create policy workouts_member_select on public.workouts
  for select using (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1
      from public.program_assignments a
      where a.program_id = workouts.program_id
        and a.tenant_id = workouts.tenant_id
        and a.status = 'active'
        and a.member_email = (select email from public.app_users where id = auth.uid())
    )
  );

drop policy if exists assignments_coach on public.program_assignments;
create policy assignments_coach on public.program_assignments
  for all using (tenant_id = public.current_tenant_id() and public.is_tenant_coach())
  with check (tenant_id = public.current_tenant_id() and public.is_tenant_coach());

drop policy if exists assignments_member_select on public.program_assignments;
create policy assignments_member_select on public.program_assignments
  for select using (
    tenant_id = public.current_tenant_id()
    and member_email = (select email from public.app_users where id = auth.uid())
  );

drop policy if exists workout_logs_own on public.workout_logs;
create policy workout_logs_own on public.workout_logs
  for all using (user_id = auth.uid() and tenant_id = public.current_tenant_id())
  with check (user_id = auth.uid() and tenant_id = public.current_tenant_id());

drop policy if exists workout_logs_coach_select on public.workout_logs;
create policy workout_logs_coach_select on public.workout_logs
  for select using (tenant_id = public.current_tenant_id() and public.is_tenant_coach());
