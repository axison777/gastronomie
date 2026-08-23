alter table public.settings
  add column if not exists timezone text default 'Europe/Paris (GMT+1)',
  add column if not exists maintenance_message text,
  add column if not exists whatsapp_prefix text default '+226 (BF)',
  add column if not exists whatsapp_number text;
