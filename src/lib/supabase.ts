import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Employee {
  id: string;
  name: string;
  site?: string;
  department?: string;
  created_at: string;
}

export interface Meal {
  id: string;
  name: string;
  created_at: string;
  has_options?: boolean;
  is_active?: boolean;
}

export interface Order {
  id: string;
  employee_id: string;
  meal_id: string;
  order_date: string;
  created_at: string;
  protein_option?: 'Viande' | 'Poisson' | null;
}

export interface Settings {
  id: string;
  lock_time: string;
  last_publish_date: string | null;
  admin_password?: string;
}
