-- Ajax Training M0 — multi-tenant core + RLS
-- Apply in Supabase SQL editor or: psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql

create extension if not exists pgcrypto;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

insert into public.tenants (id, slug, name)
values ('11111111-1111-1111-1111-111111111111', 'ajax', 'Ajax Fitness')
on conflict (slug) do nothing;

-- Member-facing users. id matches auth.users when Supabase Auth is live.
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  email text not null,
  full_name text not null,
  role text not null default 'member' check (role in ('member', 'auditor', 'owner')),
  created_at timestamptz not null default now(),
  unique (tenant_id, email)
);

create table if not exists public.member_roster (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  email text not null,
  full_name text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  unique (tenant_id, email)
);

create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  user_id uuid not null references public.app_users (id) on delete cascade,
  kind text not null check (kind in ('account_privacy')),
  questionnaire jsonb not null default '{}'::jsonb,
  accepted_at timestamptz not null default now(),
  unique (tenant_id, user_id, kind)
);

create table if not exists public.onboarding_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  user_id uuid not null references public.app_users (id) on delete cascade,
  current_section int not null default 1 check (current_section between 1 and 9),
  sections jsonb not null default '{}'::jsonb,
  confirmed_sections int[] not null default '{}',
  client_summary jsonb,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create index if not exists member_roster_tenant_email_idx on public.member_roster (tenant_id, email);
create index if not exists app_users_tenant_email_idx on public.app_users (tenant_id, email);
create index if not exists onboarding_profiles_tenant_user_idx on public.onboarding_profiles (tenant_id, user_id);

alter table public.tenants enable row level security;
alter table public.app_users enable row level security;
alter table public.member_roster enable row level security;
alter table public.consents enable row level security;
alter table public.onboarding_profiles enable row level security;

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
as $$
  select u.tenant_id
  from public.app_users u
  where u.id = auth.uid()
$$;

drop policy if exists tenants_select_own on public.tenants;
create policy tenants_select_own on public.tenants
  for select using (id = public.current_tenant_id());

drop policy if exists app_users_select_tenant on public.app_users;
create policy app_users_select_tenant on public.app_users
  for select using (tenant_id = public.current_tenant_id());

drop policy if exists app_users_update_self on public.app_users;
create policy app_users_update_self on public.app_users
  for update using (id = auth.uid() and tenant_id = public.current_tenant_id());

drop policy if exists roster_select_tenant on public.member_roster;
create policy roster_select_tenant on public.member_roster
  for select using (tenant_id = public.current_tenant_id());

drop policy if exists consents_own on public.consents;
create policy consents_own on public.consents
  for all using (user_id = auth.uid() and tenant_id = public.current_tenant_id())
  with check (user_id = auth.uid() and tenant_id = public.current_tenant_id());

drop policy if exists onboarding_own on public.onboarding_profiles;
create policy onboarding_own on public.onboarding_profiles
  for all using (user_id = auth.uid() and tenant_id = public.current_tenant_id())
  with check (user_id = auth.uid() and tenant_id = public.current_tenant_id());
