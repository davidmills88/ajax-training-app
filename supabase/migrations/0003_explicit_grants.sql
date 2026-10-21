-- Ajax Training — explicit Data API grants (Supabase change effective 2026-10-30)
-- Apply after 0002_training.sql:
--   psql "$DATABASE_URL" -f supabase/migrations/0003_explicit_grants.sql
--
-- From 2026-10-30 Supabase stops auto-granting anon / authenticated /
-- service_role on new tables in "public". The API talks to Postgres directly
-- as the owner role, so it is not affected today. These grants make the
-- Data API access that RLS policies assume explicit, so any fresh database
-- (or a future client that reads through PostgREST) behaves the same.
--
-- anon gets nothing: every policy keys off auth.uid().
-- Safe to re-run: GRANT is idempotent. Does not revoke anything.
--
-- Rule for new migrations: every `create table public.x` must be followed by
--   alter table public.x enable row level security;
--   grant select, insert, update, delete on public.x to authenticated;
--   grant all on public.x to service_role;

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on
  public.tenants,
  public.app_users,
  public.member_roster,
  public.consents,
  public.onboarding_profiles,
  public.programs,
  public.workouts,
  public.program_assignments,
  public.workout_logs
to authenticated;

grant all on
  public.tenants,
  public.app_users,
  public.member_roster,
  public.consents,
  public.onboarding_profiles,
  public.programs,
  public.workouts,
  public.program_assignments,
  public.workout_logs
to service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;

grant execute on function public.current_tenant_id() to authenticated, service_role;
grant execute on function public.is_tenant_coach() to authenticated, service_role;
