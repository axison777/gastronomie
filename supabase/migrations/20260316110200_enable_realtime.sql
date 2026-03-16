-- Enable Realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE settings;
-- Also ensure employees and meals are included if needed, 
-- but orders and settings are the most critical for live updates.
