-- حصالتي (Hsalati) — run in Supabase SQL Editor (Dashboard → SQL → New query → Run)

create table if not exists public.users (
  id            bigserial primary key,
  username      text not null,
  password_hash text not null,
  role          text not null default 'user' check (role in ('user', 'admin')),
  created_at    timestamptz not null default now()
);

create table if not exists public.savings_plans (
  id            uuid primary key default gen_random_uuid(),
  user_id       bigint not null references public.users(id) on delete cascade,
  name          text not null,
  goal          integer not null,
  days          integer not null,
  grid          jsonb not null default '[]',
  checked       jsonb not null default '{}',
  daily_target  numeric(10, 1) not null default 0,
  created_at    timestamptz not null default now()
);

create unique index if not exists users_username_lower_idx on public.users (lower(username));
create index if not exists savings_plans_user_id_idx on public.savings_plans(user_id);
create index if not exists savings_plans_created_at_idx on public.savings_plans(created_at desc);

-- Server uses service_role key — disable RLS for simplicity
alter table public.users disable row level security;
alter table public.savings_plans disable row level security;

-- Clean up old policies if they exist
drop policy if exists "deny anon users" on public.users;
drop policy if exists "deny anon plans" on public.savings_plans;
