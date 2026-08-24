-- Correction des politiques de sécurité (RLS) pour announcements et hero_banners

-- 1. Table announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on announcements" ON public.announcements;
DROP POLICY IF EXISTS "Allow authenticated insert on announcements" ON public.announcements;
DROP POLICY IF EXISTS "Allow authenticated update on announcements" ON public.announcements;
DROP POLICY IF EXISTS "Allow authenticated delete on announcements" ON public.announcements;
DROP POLICY IF EXISTS "Allow public insert on announcements" ON public.announcements;
DROP POLICY IF EXISTS "Allow public update on announcements" ON public.announcements;
DROP POLICY IF EXISTS "Allow public delete on announcements" ON public.announcements;

CREATE POLICY "Allow public read access on announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Allow public insert on announcements" ON public.announcements FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on announcements" ON public.announcements FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on announcements" ON public.announcements FOR DELETE USING (true);

-- 2. Table hero_banners
ALTER TABLE public.hero_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on hero_banners" ON public.hero_banners;
DROP POLICY IF EXISTS "Allow authenticated insert on hero_banners" ON public.hero_banners;
DROP POLICY IF EXISTS "Allow authenticated update on hero_banners" ON public.hero_banners;
DROP POLICY IF EXISTS "Allow authenticated delete on hero_banners" ON public.hero_banners;
DROP POLICY IF EXISTS "Allow public insert on hero_banners" ON public.hero_banners;
DROP POLICY IF EXISTS "Allow public update on hero_banners" ON public.hero_banners;
DROP POLICY IF EXISTS "Allow public delete on hero_banners" ON public.hero_banners;

CREATE POLICY "Allow public read access on hero_banners" ON public.hero_banners FOR SELECT USING (true);
CREATE POLICY "Allow public insert on hero_banners" ON public.hero_banners FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on hero_banners" ON public.hero_banners FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on hero_banners" ON public.hero_banners FOR DELETE USING (true);
