import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Site {
  id: string;
  name: string;
  address?: string;
  created_at: string;
}

export interface Department {
  id: string;
  site_id: string;
  name: string;
  created_at: string;
}

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  site_id?: string;
  department_id?: string;
  is_active: boolean;
  created_at: string;
  
  // Relations issues des requêtes jointes
  site?: { name: string };
  department?: { name: string };
}

export interface Meal {
  id: string;
  name: string;
  created_at: string;
  has_options?: boolean;
  is_active?: boolean;
  image_url?: string;
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
  timezone?: string;
  maintenance_message?: string | null;
  whatsapp_prefix?: string;
  whatsapp_number?: string | null;
}

export interface OrderHistoryDetail {
  meal_name: string;
  protein_option: 'Viande' | 'Poisson' | null;
  count: number;
}

export interface OrderHistory {
  id: string;
  publish_date: string;
  total_orders: number;
  details: OrderHistoryDetail[];
  created_at: string;
}

