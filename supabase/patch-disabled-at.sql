-- Quick fix: add missing users.disabled_at column (safe to re-run)
alter table public.users add column if not exists disabled_at timestamptz;
notify pgrst, 'reload schema';
