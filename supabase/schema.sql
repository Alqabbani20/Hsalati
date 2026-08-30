-- حصالتي (Hsalati) — run this in Supabase SQL Editor
-- Dashboard → SQL → New query → paste → Run

create table if not exists public.users (
  id            bigserial primary key,
  username      text not null unique,
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

create index if not exists savings_plans_user_id_idx on public.savings_plans(user_id);
create index if not exists savings_plans_created_at_idx on public.savings_plans(created_at desc);

-- Case-insensitive username lookup
create unique index if not exists users_username_lower_idx on public.users (lower(username));

alter table public.users enable row level security;
alter table public.savings_plans enable row level security;

-- Server uses service_role key (bypasses RLS). Block public anon access.
create policy "deny anon users" on public.users for all to anon using (false);
create policy "deny anon plans" on public.savings_plans for all to anon using (false);
