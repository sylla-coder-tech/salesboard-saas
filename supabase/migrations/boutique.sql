-- ============================================================
-- BOUTIQUE EN LIGNE — Tables
-- À exécuter dans Supabase : Dashboard → SQL Editor → Run
-- ============================================================

-- 1. Table boutiques — config de la boutique par entreprise
CREATE TABLE IF NOT EXISTS boutiques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id uuid NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  actif boolean NOT NULL DEFAULT false,
  nom_boutique text,
  description text,
  couleur_principale text DEFAULT '#3b82f6',
  banniere_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour recherche rapide par slug (accès public)
CREATE INDEX IF NOT EXISTS idx_boutiques_slug ON boutiques(slug);
CREATE INDEX IF NOT EXISTS idx_boutiques_entreprise ON boutiques(entreprise_id);

-- Une seule boutique par entreprise
CREATE UNIQUE INDEX IF NOT EXISTS idx_boutiques_entreprise_unique ON boutiques(entreprise_id);

-- RLS
ALTER TABLE boutiques ENABLE ROW LEVEL SECURITY;

-- Lecture publique uniquement si actif = true
CREATE POLICY "Boutique publique visible si active"
  ON boutiques FOR SELECT
  USING (actif = true OR auth.uid() IN (
    SELECT p.id FROM profils p WHERE p.entreprise_id = boutiques.entreprise_id
  ));

-- Écriture uniquement par les membres de l'entreprise
CREATE POLICY "Membres peuvent gérer leur boutique"
  ON boutiques FOR ALL
  USING (auth.uid() IN (
    SELECT p.id FROM profils p WHERE p.entreprise_id = boutiques.entreprise_id
  ));

-- ============================================================

-- 2. Table boutique_produits — produits visibles dans la boutique
CREATE TABLE IF NOT EXISTS boutique_produits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id uuid NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  produit_id bigint NOT NULL REFERENCES produits(id) ON DELETE CASCADE,
  entreprise_id uuid NOT NULL,
  ordre integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(boutique_id, produit_id)
);

CREATE INDEX IF NOT EXISTS idx_boutique_produits_boutique ON boutique_produits(boutique_id);

ALTER TABLE boutique_produits ENABLE ROW LEVEL SECURITY;

-- Lecture publique (les clients peuvent voir les produits)
CREATE POLICY "Produits boutique visibles publiquement"
  ON boutique_produits FOR SELECT
  USING (true);

-- Écriture uniquement par les membres de l'entreprise
CREATE POLICY "Membres peuvent gérer les produits boutique"
  ON boutique_produits FOR ALL
  USING (auth.uid() IN (
    SELECT p.id FROM profils p WHERE p.entreprise_id = boutique_produits.entreprise_id
  ));

-- ============================================================

-- 3. Table commandes — commandes passées par les clients
CREATE TABLE IF NOT EXISTS commandes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id uuid NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  boutique_id uuid NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  -- Infos client
  client_nom text NOT NULL,
  client_telephone text NOT NULL,
  client_adresse text,
  -- Contenu de la commande (JSON : [{produit_id, nom, quantite, prix_unitaire, sous_total}])
  lignes jsonb NOT NULL DEFAULT '[]',
  -- Montants
  total numeric(12,2) NOT NULL DEFAULT 0,
  -- Statut
  statut text NOT NULL DEFAULT 'en_attente'
    CHECK (statut IN ('en_attente', 'confirmee', 'livree', 'annulee')),
  -- Notes
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commandes_entreprise ON commandes(entreprise_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commandes_statut ON commandes(entreprise_id, statut);

ALTER TABLE commandes ENABLE ROW LEVEL SECURITY;

-- Insertion publique (les clients peuvent passer commande sans compte)
CREATE POLICY "Clients peuvent passer commande"
  ON commandes FOR INSERT
  WITH CHECK (true);

-- Lecture uniquement par les membres de l'entreprise
CREATE POLICY "Membres peuvent voir leurs commandes"
  ON commandes FOR SELECT
  USING (auth.uid() IN (
    SELECT p.id FROM profils p WHERE p.entreprise_id = commandes.entreprise_id
  ));

-- Mise à jour uniquement par les membres de l'entreprise
CREATE POLICY "Membres peuvent mettre à jour les commandes"
  ON commandes FOR UPDATE
  USING (auth.uid() IN (
    SELECT p.id FROM profils p WHERE p.entreprise_id = commandes.entreprise_id
  ));
