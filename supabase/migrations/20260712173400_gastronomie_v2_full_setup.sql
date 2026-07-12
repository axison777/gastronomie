-- Gastronomie Service V2 — full schema (idempotent)

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  created_at timestamptz not null default now()
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  site_id uuid references public.sites(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  has_options boolean not null default false,
  is_active boolean not null default false,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  meal_id uuid not null references public.meals(id) on delete cascade,
  order_date date not null default current_date,
  protein_option text check (protein_option in ('Viande', 'Poisson')),
  created_at timestamptz not null default now()
);

create unique index if not exists orders_unique_per_day
  on public.orders (employee_id, meal_id, order_date);

create table if not exists public.settings (
  id text primary key default 'config',
  lock_time text not null default '11:30',
  last_publish_date date
);

insert into public.settings (id, lock_time, last_publish_date)
values ('config', '18:00', current_date)
on conflict (id) do update set
  lock_time = excluded.lock_time,
  last_publish_date = coalesce(public.settings.last_publish_date, excluded.last_publish_date);

alter table public.sites enable row level security;
alter table public.departments enable row level security;
alter table public.employees enable row level security;
alter table public.meals enable row level security;
alter table public.orders enable row level security;
alter table public.settings enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sites' and policyname = 'anon_all_sites') then
    create policy "anon_all_sites" on public.sites for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'departments' and policyname = 'anon_all_departments') then
    create policy "anon_all_departments" on public.departments for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'employees' and policyname = 'anon_all_employees') then
    create policy "anon_all_employees" on public.employees for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'meals' and policyname = 'anon_all_meals') then
    create policy "anon_all_meals" on public.meals for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'orders' and policyname = 'anon_all_orders') then
    create policy "anon_all_orders" on public.orders for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'settings' and policyname = 'anon_all_settings') then
    create policy "anon_all_settings" on public.settings for all using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'meals') then
    alter publication supabase_realtime add table public.meals;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'settings') then
    alter publication supabase_realtime add table public.settings;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sites') then
    alter publication supabase_realtime add table public.sites;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'departments') then
    alter publication supabase_realtime add table public.departments;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'employees') then
    alter publication supabase_realtime add table public.employees;
  end if;
end $$;
