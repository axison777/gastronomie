-- =============================================================================
-- GASTRONOMIE SERVICE — SUPABASE LOCAL SEED DATA
-- =============================================================================

-- 1. Sites
INSERT INTO public.sites (id, name, address) VALUES 
('11111111-1111-1111-1111-111111111111', 'Siège Ouagadougou', 'Avenue Kwame Nkrumah, Ouagadougou'),
('22222222-2222-2222-2222-222222222222', 'Annexe Bobo-Dioulasso', 'Secteur 5, Bobo-Dioulasso')
ON CONFLICT (id) DO NOTHING;

-- 2. Departments
INSERT INTO public.departments (id, site_id, name) VALUES 
('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'Direction Générale'),
('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'Ressources Humaines'),
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Informatique'),
('33333333-3333-3333-3333-333333333334', '22222222-2222-2222-2222-222222222222', 'Logistique')
ON CONFLICT (id) DO NOTHING;

-- 3. Employees
INSERT INTO public.employees (id, first_name, last_name, site_id, department_id, is_active) VALUES
('44444444-4444-4444-4444-444444444441', 'Amadou', 'Diallo', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', true),
('44444444-4444-4444-4444-444444444442', 'Fatou', 'Traoré', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333332', true),
('44444444-4444-4444-4444-444444444443', 'Ismaël', 'Ouédraogo', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', true),
('44444444-4444-4444-4444-444444444444', 'Sophie', 'Bationo', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333334', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Meals
INSERT INTO public.meals (id, name, has_options, is_active) VALUES
('55555555-5555-5555-5555-555555555551', 'Riz Gras', false, true),
('55555555-5555-5555-5555-555555555552', 'Attiéké poisson', false, true),
('55555555-5555-5555-5555-555555555553', 'Tô sauce', false, true),
('55555555-5555-5555-5555-555555555554', 'Riz sauce arachide', false, true),
('55555555-5555-5555-5555-555555555555', 'Salade composée', false, false)
ON CONFLICT (id) DO NOTHING;

-- 5. Orders
INSERT INTO public.orders (employee_id, meal_id, order_date) VALUES 
('44444444-4444-4444-4444-444444444441', '55555555-5555-5555-5555-555555555551', current_date),
('44444444-4444-4444-4444-444444444442', '55555555-5555-5555-5555-555555555552', current_date),
('44444444-4444-4444-4444-444444444443', '55555555-5555-5555-5555-555555555553', current_date),
('44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555553', current_date - interval '1 day')
ON CONFLICT DO NOTHING;

-- Create Admin User in Supabase Auth (admin@gastronomie.com / admin123)
DO $$
DECLARE
  uid uuid := '11111111-1111-1111-1111-111111111111'::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@gastronomie.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', 'admin@gastronomie.com', crypt('admin123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id) 
    VALUES (uid, uid, format('{"sub":"%s","email":"%s"}', uid, 'admin@gastronomie.com')::jsonb, 'email', now(), now(), now(), uid::text);
  END IF;
END $$;
