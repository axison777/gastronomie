import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Employee {
  id: string;
  name: string;
  created_at: string;
}

export interface Meal {
  id: string;
  name: string;
  created_at: string;
}

export interface Order {
  id: string;
  employee_id: string;
  meal_id: string;
  order_date: string;
  created_at: string;
}
