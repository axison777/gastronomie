-- Création de la table des bannières d'en-tête (hero_banners)
create table if not exists public.hero_banners (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  subtitle text not null,
  image_url text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Sécurité RLS pour hero_banners
alter table public.hero_banners enable row level security;
create policy "Allow public read access on hero_banners" on public.hero_banners for select using (true);
create policy "Allow authenticated insert on hero_banners" on public.hero_banners for insert with check (true);
create policy "Allow authenticated update on hero_banners" on public.hero_banners for update using (true);
create policy "Allow authenticated delete on hero_banners" on public.hero_banners for delete using (true);

-- Suppression des anciennes colonnes d'en-tête de la table settings si elles existaient
alter table public.settings
  drop column if exists hero_title,
  drop column if exists hero_subtitle,
  drop column if exists hero_image_url;
