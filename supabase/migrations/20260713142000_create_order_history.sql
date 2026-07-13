-- Create order_history table to store daily aggregated reports
create table if not exists public.order_history (
  id uuid primary key default gen_random_uuid(),
  publish_date date not null,
  total_orders integer not null,
  details jsonb not null,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.order_history enable row level security;

-- Add RLS policy for anonymous access
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'order_history' and policyname = 'anon_all_order_history') then
    create policy "anon_all_order_history" on public.order_history for all using (true) with check (true);
  end if;
end $$;

-- Add to Realtime publication
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'order_history') then
    alter publication supabase_realtime add table public.order_history;
  end if;
end $$;
