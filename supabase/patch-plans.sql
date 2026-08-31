-- Add plan progress + theme columns (safe to re-run)
alter table public.savings_plans add column if not exists partials jsonb not null default '{}'::jsonb;
alter table public.savings_plans add column if not exists milestones_shown jsonb not null default '{}'::jsonb;
alter table public.user_profiles add column if not exists color_theme text check (color_theme is null or color_theme in ('pink', 'blue', 'dark'));
notify pgrst, 'reload schema';
