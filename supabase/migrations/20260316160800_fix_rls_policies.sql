-- Ajout des politiques de modification et suppression pour les plats
CREATE POLICY "Tout le monde peut modifier les plats"
  ON meals FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Tout le monde peut supprimer les plats"
  ON meals FOR DELETE
  USING (true);

-- Ajout des politiques de modification et suppression pour les employés
CREATE POLICY "Tout le monde peut modifier les employés"
  ON employees FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Tout le monde peut supprimer les employés"
  ON employees FOR DELETE
  USING (true);

-- Sécurisation de la table settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tout le monde peut lire les paramètres"
  ON settings FOR SELECT
  USING (true);

CREATE POLICY "Tout le monde peut modifier les paramètres"
  ON settings FOR UPDATE
  USING (true)
  WITH CHECK (true);
