import { supabase } from '../../../lib/supabaseClient';
import { getMyProfile } from '../../auth/services/profileService';

/**
 * Génère un slug à partir d'un nom d'entreprise
 * "Mon Entreprise SARL" → "mon-entreprise-sarl"
 */
export function generateSlug(nom) {
  return nom
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprime les accents
    .replace(/[^a-z0-9\s-]/g, '')   // garde lettres, chiffres, espaces, tirets
    .trim()
    .replace(/\s+/g, '-')            // espaces → tirets
    .replace(/-+/g, '-');            // tirets multiples → un seul
}

// ─── BOUTIQUE ──────────────────────────────────────────────────────────────

/**
 * Récupère la boutique de l'entreprise connectée (ou null si inexistante)
 */
export async function getMyBoutique() {
  const profile = await getMyProfile();

  const { data, error } = await supabase
    .from('boutiques')
    .select('*')
    .eq('entreprise_id', profile.entreprise_id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Crée la boutique pour l'entreprise connectée
 */
export async function createBoutique(payload) {
  const profile = await getMyProfile();

  // Récupère le nom de l'entreprise pour générer le slug
  const { data: entreprise, error: entrepriseError } = await supabase
    .from('entreprises')
    .select('nom')
    .eq('id', profile.entreprise_id)
    .single();

  if (entrepriseError) throw entrepriseError;

  const baseSlug = generateSlug(payload.slug || entreprise.nom);

  // Vérifie l'unicité du slug, ajoute un suffixe si nécessaire
  let slug = baseSlug;
  let suffix = 1;
  while (true) {
    const { data: existing } = await supabase
      .from('boutiques')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (!existing) break;
    slug = `${baseSlug}-${suffix}`;
    suffix++;
  }

  const { data, error } = await supabase
    .from('boutiques')
    .insert([{
      entreprise_id: profile.entreprise_id,
      slug,
      actif: false,
      nom_boutique: payload.nom_boutique || entreprise.nom,
      description: payload.description || null,
      slogan: payload.slogan || null,
      couleur_principale: payload.couleur_principale || '#3b82f6',
      couleur_secondaire: payload.couleur_secondaire || null,
      logo_url: payload.logo_url || null,
      banniere_url: payload.banniere_url || null,
      telephone_whatsapp: payload.telephone_whatsapp || null,
      frais_livraison_defaut: Number(payload.frais_livraison_defaut) || 0,
      livraison_incluse_defaut: Boolean(payload.livraison_incluse_defaut) || false,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── UPLOAD IMAGES BOUTIQUE ──────────────────────────────────────────────

/**
 * Upload le logo de la boutique dans Supabase Storage
 */
export async function uploadBoutiqueLogo(file, entrepriseId) {
  const ext = file.name.split('.').pop();
  const path = `boutiques/${entrepriseId}/logo-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('produits-images')
    .upload(path, file, { upsert: true });

  if (error) throw error;
  return supabase.storage.from('produits-images').getPublicUrl(path).data.publicUrl;
}

/**
 * Upload la bannière de la boutique dans Supabase Storage
 */
export async function uploadBoutiqueBanniere(file, entrepriseId) {
  const ext = file.name.split('.').pop();
  const path = `boutiques/${entrepriseId}/banniere-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('produits-images')
    .upload(path, file, { upsert: true });

  if (error) throw error;
  return supabase.storage.from('produits-images').getPublicUrl(path).data.publicUrl;
}

/**
 * Met à jour les paramètres de la boutique
 */
export async function updateBoutique(boutiqueId, payload) {
  const profile = await getMyProfile();

  const updateData = {};
  if (payload.nom_boutique !== undefined) updateData.nom_boutique = payload.nom_boutique;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.slogan !== undefined) updateData.slogan = payload.slogan;
  if (payload.couleur_principale !== undefined) updateData.couleur_principale = payload.couleur_principale;
  if (payload.couleur_secondaire !== undefined) updateData.couleur_secondaire = payload.couleur_secondaire;
  if (payload.logo_url !== undefined) updateData.logo_url = payload.logo_url;
  if (payload.banniere_url !== undefined) updateData.banniere_url = payload.banniere_url;
  if (payload.actif !== undefined) updateData.actif = payload.actif;
  if (payload.telephone_whatsapp !== undefined) updateData.telephone_whatsapp = payload.telephone_whatsapp || null;
  if (payload.frais_livraison_defaut !== undefined) updateData.frais_livraison_defaut = Number(payload.frais_livraison_defaut) || 0;
  if (payload.livraison_incluse_defaut !== undefined) updateData.livraison_incluse_defaut = Boolean(payload.livraison_incluse_defaut);
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('boutiques')
    .update(updateData)
    .eq('id', boutiqueId)
    .eq('entreprise_id', profile.entreprise_id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Active ou désactive la boutique
 */
export async function toggleBoutique(boutiqueId, actif) {
  return updateBoutique(boutiqueId, { actif });
}

// ─── PRODUITS BOUTIQUE ────────────────────────────────────────────────────

/**
 * Récupère les produits sélectionnés pour la boutique
 */
export async function getBoutiqueProduits(boutiqueId) {
  const { data, error } = await supabase
    .from('boutique_produits')
    .select(`
      id,
      ordre,
      produit_id,
      prix_vente,
      produits (
        id, nom, reference, prixUnitaire, stock, image_url
      )
    `)
    .eq('boutique_id', boutiqueId)
    .order('ordre', { ascending: true });

  if (error) throw error;
  return (data || []).map((row) => ({
    ...row.produits,
    boutique_produit_id: row.id,
    ordre: row.ordre,
    prix_vente: row.prix_vente, // prix personnalisé ou null
  }));
}

/**
 * Ajoute un produit à la boutique avec un prix de vente optionnel
 */
export async function addProduitBoutique(boutiqueId, produitId, entrepriseId, prixVente = null) {
  const { data, error } = await supabase
    .from('boutique_produits')
    .insert([{
      boutique_id: boutiqueId,
      produit_id: produitId,
      entreprise_id: entrepriseId,
      prix_vente: prixVente ? Number(prixVente) : null,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Met à jour le prix de vente d'un produit en boutique
 */
export async function updatePrixVenteBoutique(boutiqueId, produitId, prixVente) {
  const { error } = await supabase
    .from('boutique_produits')
    .update({ prix_vente: prixVente ? Number(prixVente) : null })
    .eq('boutique_id', boutiqueId)
    .eq('produit_id', produitId);

  if (error) throw error;
  return true;
}

/**
 * Retire un produit de la boutique
 */
export async function removeProduitBoutique(boutiqueId, produitId) {
  const { error } = await supabase
    .from('boutique_produits')
    .delete()
    .eq('boutique_id', boutiqueId)
    .eq('produit_id', produitId);

  if (error) throw error;
  return true;
}

// ─── ACCÈS PUBLIC (sans auth) ─────────────────────────────────────────────

/**
 * Charge une boutique publique par son slug (sans auth)
 */
export async function getBoutiquePublique(slug) {
  const { data: boutique, error } = await supabase
    .from('boutiques')
    .select(`
      id, slug, nom_boutique, description, couleur_principale, banniere_url, actif, entreprise_id,
      telephone_whatsapp, frais_livraison_defaut, livraison_incluse_defaut,
      entreprises (id, nom, logo_url)
    `)
    .eq('slug', slug)
    .eq('actif', true)
    .maybeSingle();

  if (error) throw error;
  return boutique;
}

/**
 * Charge les produits publics d'une boutique (stock > 0 uniquement)
 */
export async function getProduitsBoutiquePublique(boutiqueId) {
  const { data, error } = await supabase
    .from('boutique_produits')
    .select(`
      prix_vente,
      produits (
        id, nom, reference, prixUnitaire, stock, image_url
      )
    `)
    .eq('boutique_id', boutiqueId)
    .order('ordre', { ascending: true });

  if (error) throw error;

  return (data || [])
    .map((row) => {
      if (!row.produits) return null;
      return {
        ...row.produits,
        // Prix affiché = prix de vente personnalisé si défini, sinon prix du catalogue
        prixUnitaire: row.prix_vente ? Number(row.prix_vente) : row.produits.prixUnitaire,
        prixOriginal: row.produits.prixUnitaire, // prix de gros (pour le calcul du bénéfice)
      };
    })
    .filter((p) => p && Number(p.stock || 0) > 0);
}

// ─── COMMANDES ────────────────────────────────────────────────────────────

/**
 * Passe une commande via Edge Function (sans auth requise)
 */
export async function passerCommande(payload) {
  const { data, error } = await supabase.functions.invoke('passer-commande', {
    body: {
      entreprise_id:    payload.entreprise_id,
      boutique_id:      payload.boutique_id,
      client_nom:       payload.client_nom,
      client_telephone: payload.client_telephone,
      client_adresse:   payload.client_adresse || null,
      lignes:           payload.lignes,
      total:            payload.total,
      notes:            payload.notes || null,
      frais_livraison:  payload.frais_livraison || 0,
      livraison_incluse: payload.livraison_incluse || false,
    },
  });

  if (error) throw new Error(error.message || 'Erreur lors de la commande.');
  if (data?.error) throw new Error(data.error);

  return data?.commande; // contient numero_commande
}

/**
 * Récupère une commande publique par son numéro (sans auth)
 * Utilisé par la page de suivi /suivi/:numero
 */
export async function getCommandePublique(numeroCommande) {
  const { data, error } = await supabase
    .from('commandes')
    .select(`
      id,
      numero_commande,
      statut,
      total,
      frais_livraison,
      livraison_incluse,
      client_nom,
      client_telephone,
      client_adresse,
      notes,
      lignes,
      created_at,
      boutiques (
        id, slug, nom_boutique, couleur_principale
      )
    `)
    .eq('numero_commande', numeroCommande.toUpperCase())
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Récupère toutes les commandes de l'entreprise connectée
 */
export async function getCommandes(filtreStatut = null) {
  const profile = await getMyProfile();

  let query = supabase
    .from('commandes')
    .select('*')
    .eq('entreprise_id', profile.entreprise_id)
    .order('created_at', { ascending: false });

  if (filtreStatut) {
    query = query.eq('statut', filtreStatut);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Met à jour le statut d'une commande.
 * La boutique est un module indépendant : aucune action automatique
 * sur le stock ou la caisse. L'admin gère ces flux manuellement.
 */
export async function updateStatutCommande(commandeId, statut) {
  const profile = await getMyProfile();

  // Récupère la commande
  const { data: commande, error: fetchError } = await supabase
    .from('commandes')
    .select('*')
    .eq('id', commandeId)
    .eq('entreprise_id', profile.entreprise_id)
    .single();

  if (fetchError) throw fetchError;

  // Met à jour le statut de la commande uniquement
  const { data, error } = await supabase
    .from('commandes')
    .update({ statut, updated_at: new Date().toISOString() })
    .eq('id', commandeId)
    .eq('entreprise_id', profile.entreprise_id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Supprime une commande annulée
 */
export async function deleteCommande(commandeId) {
  const profile = await getMyProfile();

  const { error } = await supabase
    .from('commandes')
    .delete()
    .eq('id', commandeId)
    .eq('entreprise_id', profile.entreprise_id);

  if (error) throw error;
  return true;
}


// ─── STATS BOUTIQUE ───────────────────────────────────────────────────────

/**
 * Retourne les stats de commandes pour la boutique :
 * total, en_attente, confirmee, livree, ca_total, ca_mois
 */
export async function getStatsCommandes() {
  const profile = await getMyProfile();

  const { data, error } = await supabase
    .from('commandes')
    .select('statut, total, created_at')
    .eq('entreprise_id', profile.entreprise_id);

  if (error) throw error;

  const commandes = data || [];
  const now = new Date();
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const stats = {
    total: commandes.length,
    en_attente: 0,
    confirmee: 0,
    livree: 0,
    annulee: 0,
    ca_total: 0,
    ca_mois: 0,
  };

  for (const c of commandes) {
    if (c.statut === 'en_attente') stats.en_attente++;
    else if (c.statut === 'confirmee') stats.confirmee++;
    else if (c.statut === 'livree') stats.livree++;
    else if (c.statut === 'annulee') stats.annulee++;

    if (c.statut !== 'annulee') {
      stats.ca_total += Number(c.total || 0);
      if (c.created_at >= debutMois) {
        stats.ca_mois += Number(c.total || 0);
      }
    }
  }

  return stats;
}
