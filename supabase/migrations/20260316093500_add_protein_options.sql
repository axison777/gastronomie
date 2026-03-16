-- Add has_options to meals table
ALTER TABLE meals ADD COLUMN IF NOT EXISTS has_options BOOLEAN DEFAULT false;

-- Add protein_option to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS protein_option TEXT;
