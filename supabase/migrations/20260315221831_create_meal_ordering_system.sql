/*
  # Système de commande de repas pour employés

  1. Nouvelles Tables
    - `employees` (employés)
      - `id` (uuid, clé primaire)
      - `name` (text) - Nom de l'employé
      - `created_at` (timestamp)
    
    - `meals` (plats)
      - `id` (uuid, clé primaire)
      - `name` (text) - Nom du plat
      - `created_at` (timestamp)
    
    - `orders` (commandes)
      - `id` (uuid, clé primaire)
      - `employee_id` (uuid, référence vers employees)
      - `meal_id` (uuid, référence vers meals)
      - `order_date` (date) - Date de la commande
      - `created_at` (timestamp)
      - Contrainte unique : un employé ne peut commander qu'un seul plat par jour

  2. Sécurité
    - Activer RLS sur toutes les tables
    - Politiques pour lecture publique (accessible sans authentification)
    - Politiques pour modification publique (l'app est utilisée en interne)
*/

-- Table des employés
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Table des plats
CREATE TABLE IF NOT EXISTS meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Table des commandes
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  meal_id uuid NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, order_date)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_employee ON orders(employee_id);

-- Activer RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Politiques pour employees (lecture publique)
CREATE POLICY "Tout le monde peut lire les employés"
  ON employees FOR SELECT
  USING (true);

CREATE POLICY "Tout le monde peut ajouter des employés"
  ON employees FOR INSERT
  WITH CHECK (true);

-- Politiques pour meals (lecture publique)
CREATE POLICY "Tout le monde peut lire les plats"
  ON meals FOR SELECT
  USING (true);

CREATE POLICY "Tout le monde peut ajouter des plats"
  ON meals FOR INSERT
  WITH CHECK (true);

-- Politiques pour orders (lecture et écriture publique)
CREATE POLICY "Tout le monde peut lire les commandes"
  ON orders FOR SELECT
  USING (true);

CREATE POLICY "Tout le monde peut créer des commandes"
  ON orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Tout le monde peut modifier les commandes"
  ON orders FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Tout le monde peut supprimer les commandes"
  ON orders FOR DELETE
  USING (true);

-- Insérer des employés par défaut
INSERT INTO employees (name) VALUES 
  ('M. Nikiema'),
  ('Fayçal'),
  ('Mady')
ON CONFLICT DO NOTHING;

-- Insérer des plats par défaut
INSERT INTO meals (name) VALUES 
  ('Riz Gras'),
  ('Ragout d''igname'),
  ('Attieke poisson'),
  ('Tô sauce'),
  ('Riz sauce arachide')
ON CONFLICT DO NOTHING;