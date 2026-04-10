import { supabase } from '../../../lib/supabaseClient';
import { getMyProfile } from '../../auth/services/profileService';

function generateNumeroFacture() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `FAC-${y}${m}${d}-${h}${min}${s}`;
}

function toNumber(value) {
  return Number(value || 0);
}

async function enrichVenteWithLignes(profile, vente) {
  if (!vente) return null;

  const { data: lignes, error: lignesError } = await supabase
    .from('vente_lignes')
    .select(`
      *,
      produits (
        id,
        nom,
        reference,
        prixUnitaire,
        image_url
      )
    `)
    .eq('vente_id', vente.id)
    .eq('entreprise_id', profile.entreprise_id)
    .order('id', { ascending: true });

  if (lignesError) throw lignesError;

  const lignesNormalisees = (lignes || []).map((ligne) => ({
    id: ligne.id,
    vente_id: ligne.vente_id,
    produit_id: ligne.produit_id,
    quantite: toNumber(ligne.quantite),
    prix_unitaire: toNumber(ligne.prix_unitaire),
    sous_total: toNumber(ligne.sous_total),
    produits: ligne.produits || null,
  }));

  return {
    ...vente,
    lignes: lignesNormalisees,
    total_articles: toNumber(vente.total_articles ?? vente.prixAchat),
    total_vente: toNumber(vente.total_vente ?? vente.prixAchat) + toNumber(vente.fraisLivraison),
    quantite_totale: toNumber(
      vente.quantite_totale ??
        lignesNormalisees.reduce((sum, ligne) => sum + toNumber(ligne.quantite), 0)
    ),
  };
}

async function enrichFactureWithVente(profile, facture) {
  if (!facture) return null;

  const { data: vente, error: venteError } = await supabase
    .from('ventes')
    .select('*')
    .eq('id', facture.vente_id)
    .eq('entreprise_id', profile.entreprise_id)
    .single();

  if (venteError) throw venteError;

  const venteEnrichie = await enrichVenteWithLignes(profile, vente);

  return {
    ...facture,
    ventes: venteEnrichie,
  };
}

export async function getFactures() {
  const profile = await getMyProfile();

  const { data, error } = await supabase
    .from('factures')
    .select('*')
    .eq('entreprise_id', profile.entreprise_id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const facturesEnrichies = await Promise.all(
    (data || []).map((facture) => enrichFactureWithVente(profile, facture))
  );

  return facturesEnrichies;
}

export async function getVentesPourFactures() {
  const profile = await getMyProfile();

  const { data, error } = await supabase
    .from('ventes')
    .select('*')
    .eq('entreprise_id', profile.entreprise_id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const ventesEnrichies = await Promise.all(
    (data || []).map((vente) => enrichVenteWithLignes(profile, vente))
  );

  return ventesEnrichies;
}

export async function addFacture(payload) {
  const profile = await getMyProfile();

  const numero_facture = generateNumeroFacture();

  const factureData = {
    entreprise_id: profile.entreprise_id,
    vente_id: payload.vente_id,
    numero_facture,
    date_facture: payload.date_facture || new Date().toISOString(),
    note: payload.note || null,
    mode_livraison: payload.mode_livraison || 'facturee_client',
    montant_livraison_affiche: Number(payload.montant_livraison_affiche || 0),
  };

  const { data, error } = await supabase
    .from('factures')
    .insert([factureData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getFactureById(factureId) {
  const profile = await getMyProfile();

  const { data, error } = await supabase
    .from('factures')
    .select('*')
    .eq('id', factureId)
    .eq('entreprise_id', profile.entreprise_id)
    .single();

  if (error) throw error;

  return enrichFactureWithVente(profile, data);
}