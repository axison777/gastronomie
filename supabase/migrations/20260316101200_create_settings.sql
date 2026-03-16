-- Settings table for global configuration
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'config',
  lock_time TEXT DEFAULT '18:00',
  last_publish_date TEXT -- To track when the menu was last published
);

-- Initial config
INSERT INTO settings (id, lock_time) 
VALUES ('config', '18:00')
ON CONFLICT (id) DO NOTHING;
