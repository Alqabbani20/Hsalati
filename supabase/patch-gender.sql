-- Quick fix: add users.gender column (safe to re-run)
alter table public.users add column if not exists gender text check (gender is null or gender in ('male', 'female'));
notify pgrst, 'reload schema';
