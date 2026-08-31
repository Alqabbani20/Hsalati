-- Add user theme preference to profiles (safe to re-run)
alter table public.user_profiles add column if not exists color_theme text check (color_theme is null or color_theme in ('pink', 'blue', 'dark'));
notify pgrst, 'reload schema';
