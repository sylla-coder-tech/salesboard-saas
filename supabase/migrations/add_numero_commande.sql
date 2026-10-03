-- ============================================================
-- Migration : Numéro de commande unique
-- À exécuter dans Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Ajouter la colonne numero_commande sur la table commandes
ALTER TABLE commandes
  ADD COLUMN IF NOT EXISTS numero_commande text;

-- 2. Index unique pour garantir qu'il n'y a pas de doublons
--    et pour accélérer la recherche publique par numéro
CREATE UNIQUE INDEX IF NOT EXISTS commandes_numero_commande_idx
  ON commandes (numero_commande)
  WHERE numero_commande IS NOT NULL;

-- 3. (Optionnel) Générer des numéros pour les commandes existantes
--    qui n'en ont pas encore
DO $$
DECLARE
  rec RECORD;
  annee TEXT;
  seq  INT;
  num  TEXT;
BEGIN
  FOR rec IN
    SELECT id, entreprise_id, created_at
    FROM commandes
    WHERE numero_commande IS NULL
    ORDER BY created_at ASC
  LOOP
    annee := TO_CHAR(rec.created_at, 'YYYY');

    -- Compte les commandes déjà numérotées cette année pour cette entreprise
    SELECT COUNT(*) + 1 INTO seq
    FROM commandes
    WHERE entreprise_id = rec.entreprise_id
      AND numero_commande LIKE 'CMD-' || annee || '-%';

    num := 'CMD-' || annee || '-' || LPAD(seq::TEXT, 4, '0');

    UPDATE commandes
    SET numero_commande = num
    WHERE id = rec.id;
  END LOOP;
END $$;
