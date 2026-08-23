alter table public.settings
  add column if not exists hero_title text,
  add column if not exists hero_subtitle text,
  add column if not exists hero_image_url text,
  add column if not exists announcement_title text,
  add column if not exists announcement_message text,
  add column if not exists announcement_image_url text,
  add column if not exists announcement_is_active boolean default false;
