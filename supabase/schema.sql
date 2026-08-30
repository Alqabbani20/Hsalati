-- Hsalati schema — run in Supabase SQL Editor (safe to re-run)

create table if not exists public.users (
  id            bigserial primary key,
  username      text not null,
  password_hash text not null,
  role          text not null default 'user' check (role in ('user', 'admin')),
  disabled_at   timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists public.savings_plans (
  id                uuid primary key default gen_random_uuid(),
  user_id           bigint not null references public.users(id) on delete cascade,
  name              text not null,
  goal              integer not null,
  days              integer not null,
  grid              jsonb not null default '[]',
  checked           jsonb not null default '{}',
  partials          jsonb not null default '{}',
  milestones_shown  jsonb not null default '{}',
  daily_target      numeric(10, 1) not null default 0,
  created_at        timestamptz not null default now()
);

create table if not exists public.user_profiles (
  user_id               bigint primary key references public.users(id) on delete cascade,
  onboarding_completed  boolean not null default false,
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
  answers     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create table if not exists public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     bigint references public.users(id) on delete set null,
  action      text not null,
  details     jsonb default '{}',
  created_at  timestamptz not null default now()
);

create unique index if not exists users_username_lower_idx on public.users (lower(username));
create index if not exists savings_plans_user_id_idx on public.savings_plans(user_id);
create index if not exists save_events_user_id_idx on public.save_events(user_id);
create index if not exists save_events_created_at_idx on public.save_events(created_at desc);
create index if not exists activity_log_created_at_idx on public.activity_log(created_at desc);

alter table public.users disable row level security;
alter table public.savings_plans disable row level security;
alter table public.user_profiles disable row level security;
alter table public.save_events disable row level security;
alter table public.user_badges disable row level security;
alter table public.survey_responses disable row level security;
alter table public.activity_log disable row level security;

-- Migrate existing tables
alter table public.users add column if not exists disabled_at timestamptz;
alter table public.savings_plans add column if not exists partials jsonb not null default '{}';
alter table public.savings_plans add column if not exists milestones_shown jsonb not null default '{}';

drop policy if exists "deny anon users" on public.users;
drop policy if exists "deny anon plans" on public.savings_plans;
