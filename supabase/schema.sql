-- Hsalati schema - run in Supabase SQL Editor (safe to re-run)
-- Tip: if you see "Backend error", run ONE block at a time (Part 1, then Part 2, ...)

create extension if not exists pgcrypto;

-- ========== PART 1: users ==========
create table if not exists public.users (
  id            bigserial primary key,
  username      text not null,
  password_hash text not null,
  role          text not null default 'user' check (role in ('user', 'admin')),
  disabled_at   timestamptz,
  gender        text check (gender is null or gender in ('male', 'female')),
  created_at    timestamptz not null default now()
);

create unique index if not exists users_username_lower_idx on public.users (lower(username));
alter table public.users add column if not exists disabled_at timestamptz;
alter table public.users add column if not exists gender text check (gender is null or gender in ('male', 'female'));
alter table public.users disable row level security;

-- ========== PART 2: savings_plans ==========
create table if not exists public.savings_plans (
  id                uuid primary key default gen_random_uuid(),
  user_id           bigint not null references public.users(id) on delete cascade,
  name              text not null,
  goal              integer not null,
  days              integer not null,
  grid              jsonb not null default '[]'::jsonb,
  checked           jsonb not null default '{}'::jsonb,
  partials          jsonb not null default '{}'::jsonb,
  milestones_shown  jsonb not null default '{}'::jsonb,
  daily_target      numeric(10, 1) not null default 0,
  created_at        timestamptz not null default now()
);

create index if not exists savings_plans_user_id_idx on public.savings_plans(user_id);
alter table public.savings_plans add column if not exists partials jsonb not null default '{}'::jsonb;
alter table public.savings_plans add column if not exists milestones_shown jsonb not null default '{}'::jsonb;
alter table public.savings_plans disable row level security;

-- ========== PART 3: other tables ==========
create table if not exists public.user_profiles (
  user_id               bigint primary key references public.users(id) on delete cascade,
  onboarding_completed  boolean not null default false,
  color_theme           text check (color_theme is null or color_theme in ('pink', 'blue', 'dark')),
  updated_at            timestamptz not null default now()
);

create table if not exists public.save_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     bigint not null references public.users(id) on delete cascade,
  plan_id     uuid references public.savings_plans(id) on delete cascade,
  amount      numeric(10, 2) not null,
  cell_key    text,
  event_type  text not null check (event_type in ('cell_check', 'cell_uncheck', 'partial')),
  created_at  timestamptz not null default now()
);

create table if not exists public.user_badges (
  user_id     bigint not null references public.users(id) on delete cascade,
  badge_id    text not null,
  earned_at   timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table if not exists public.survey_responses (
  id          uuid primary key default gen_random_uuid(),
  user_id     bigint not null references public.users(id) on delete cascade,
  answers     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     bigint references public.users(id) on delete set null,
  action      text not null,
  details     jsonb default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists save_events_user_id_idx on public.save_events(user_id);
create index if not exists save_events_created_at_idx on public.save_events(created_at desc);
create index if not exists activity_log_created_at_idx on public.activity_log(created_at desc);

alter table public.user_profiles disable row level security;
alter table public.save_events disable row level security;
alter table public.user_badges disable row level security;
alter table public.survey_responses disable row level security;
alter table public.activity_log disable row level security;

-- API access + refresh PostgREST schema cache (fixes PGRST125 Invalid path)
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;
grant all on all routines in schema public to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;

notify pgrst, 'reload schema';
