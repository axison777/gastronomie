-- Création de la table des annonces/messages dynamiques
create table if not exists public.announcements (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  message text not null,
  image_url text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Sécurité RLS pour announcements
alter table public.announcements enable row level security;
create policy "Allow public read access on announcements" on public.announcements for select using (true);
create policy "Allow authenticated insert on announcements" on public.announcements for insert with check (true);
create policy "Allow authenticated update on announcements" on public.announcements for update using (true);
create policy "Allow authenticated delete on announcements" on public.announcements for delete using (true);

-- (Optionnel) Suppression des anciennes colonnes d'annonces de la table settings si elles existaient
alter table public.settings
  drop column if exists announcement_title,
  drop column if exists announcement_message,
  drop column if exists announcement_image_url,
  drop column if exists announcement_is_active;


-- Configuration de Supabase Storage pour les images
insert into storage.buckets (id, name, public) 
values ('public-assets', 'public-assets', true)
on conflict (id) do nothing;

-- Sécurité RLS pour le stockage (Lecture publique)
create policy "Allow public read access on storage" 
on storage.objects for select 
using (bucket_id = 'public-assets');

-- Sécurité RLS pour le stockage (Upload public - car pas de Supabase Auth dans l'appli)
create policy "Allow public insert access on storage" 
on storage.objects for insert 
with check (bucket_id = 'public-assets');

create policy "Allow public update access on storage" 
on storage.objects for update 
using (bucket_id = 'public-assets');

create policy "Allow public delete access on storage" 
on storage.objects for delete 
using (bucket_id = 'public-assets');
