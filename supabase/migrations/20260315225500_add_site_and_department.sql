-- Ajout des colonnes site et département à la table employees
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS site text,
ADD COLUMN IF NOT EXISTS department text;

-- Mettre à jour les politiques (les colonnes sont déjà couvertes par les politiques SELECT/INSERT/UPDATE существующие, 
-- mais on s'assure qu'elles sont utilisables)
-- Note: Les politiques actuelles sur 'employees' utilisent USING (true), ce qui est suffisant.
