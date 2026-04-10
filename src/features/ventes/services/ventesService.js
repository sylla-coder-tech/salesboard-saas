import { supabase } from '../../../lib/supabaseClient';
import { getMyProfile } from '../../auth/services/profileService';

function normalizeText(value) {
  return String(value || '').trim();
}

function toNumber(value) {
  return Number(value || 0);
}

async function findOrCreateClientFromSale(profile, payload) {
  const nom = normalizeText(payload.nomClient);
  const prenom = normalizeText(payload.prenomClient);
  const telephone = normalizeText(payload.telephone);
  const adresse = normalizeText(payload.adresse);

  if (!nom) {
    return null;
  }

  let existingClient = null;

  if (telephone) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('entreprise_id', profile.entreprise_id)
      .eq('telephone', telephone)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    existingClient = data;
  }

  if (!existingClient) {
    let query = supabase
      .from('clients')
      .select('*')
      .eq('entreprise_id', profile.entreprise_id)
      .eq('nom', nom);

    if (prenom) {
      query = query.eq('prenom', prenom);
    } else {
      query = query.is('prenom', null);
    }

    if (adresse) {
      query = query.eq('adresse', adresse);
    } else {
      query = query.is('adresse', null);
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error) throw error;
    existingClient = data;
  }

  if (existingClient) {
    return existingClient;
  }

  const clientPayload = {
    entreprise_id: profile.entreprise_id,
    nom,
    prenom: prenom || null,
    telephone: telephone || null,
    adresse: adresse || null,
    note: 'Client créé automatiquement depuis une vente',
  };

  const { data: newClient, error: createClientError } = await supabase
    .from('clients')
    .insert([clientPayload])
    .select()
    .single();

  if (createClientError) throw createClientError;

  return newClient;
}

function validateLignes(lignes) {
  if (!Array.isArray(lignes) || lignes.length === 0) {
    throw new Error('Ajoutez au moins un produit à la vente.');
  }

  return lignes.map((ligne) => {
    const produit_id = toNumber(ligne.produit_id);
    const quantite = toNumber(ligne.quantite);
    const prix_unitaire = toNumber(ligne.prix_unitaire);

    if (!produit_id) {
      throw new Error('Un produit de la vente est invalide.');
    }

    if (quantite <= 0) {
      throw new Error('La quantité doit être supérieure à 0.');
    }

    if (prix_unitaire <= 0) {
      throw new Error('Le prix de vente doit être supérieur à 0.');
    }

    return {
      produit_id,
      quantite,
      prix_unitaire,
    };
  });
}

export async function getVentes() {
  const profile = await getMyProfile();

  const { data, error } = await supabase
    .from('ventes_details')
    .select('*')
    .eq('entreprise_id', profile.entreprise_id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addVente(payload) {
  const profile = await getMyProfile();

  const lignes = validateLignes(payload.lignes);

  await findOrCreateClientFromSale(profile, payload);

  const produitIds = [...new Set(lignes.map((ligne) => ligne.produit_id))];

  const { data: produits, error: produitsError } = await supabase
    .from('produits')
    .select('*')
    .eq('entreprise_id', profile.entreprise_id)
    .in('id', produitIds);

  if (produitsError) throw produitsError;

  const produitsMap = new Map((produits || []).map((produit) => [Number(produit.id), produit]));

  const lignesCalculees = lignes.map((ligne) => {
    const produit = produitsMap.get(ligne.produit_id);

    if (!produit) {
      throw new Error(`Produit introuvable pour l'identifiant ${ligne.produit_id}.`);
    }

    const stockActuel = toNumber(produit.stock);
    if (stockActuel < ligne.quantite) {
      throw new Error(`Stock insuffisant pour le produit "${produit.nom}".`);
    }

    const prix_achat_unitaire = toNumber(produit.prixUnitaire || 0);
    const sous_total = ligne.quantite * ligne.prix_unitaire;
    const cout_total = ligne.quantite * prix_achat_unitaire;
    const benefice_ligne = sous_total - cout_total;

    return {
      ...ligne,
      prix_achat_unitaire,
      sous_total,
      cout_total,
      benefice_ligne,
    };
  });

  const totalArticles = lignesCalculees.reduce((sum, ligne) => sum + ligne.sous_total, 0);
  const coutTotalVente = lignesCalculees.reduce((sum, ligne) => sum + ligne.cout_total, 0);
  const quantiteTotale = lignesCalculees.reduce((sum, ligne) => sum + ligne.quantite, 0);
  const fraisLivraison = toNumber(payload.fraisLivraison);
  const totalVente = totalArticles + fraisLivraison;
  const beneficeNet = totalArticles - coutTotalVente - fraisLivraison;

  const venteData = {
    entreprise_id: profile.entreprise_id,
    produit_id: null,
    prixAchat: totalArticles,
    fraisLivraison,
    benefice: beneficeNet,
    total_articles: totalArticles,
    total_vente: totalVente,
    quantite_totale: quantiteTotale,
    cout_total_vente: coutTotalVente,
    benefice_net: beneficeNet,
    nomClient: normalizeText(payload.nomClient),
    prenomClient: normalizeText(payload.prenomClient) || null,
    telephone: normalizeText(payload.telephone) || null,
    adresse: normalizeText(payload.adresse) || null,
    statut: payload.statut || 'payee',
    dateAchat: payload.dateAchat || new Date().toISOString(),
    imageProduit: null,
  };

  const { data: vente, error: venteError } = await supabase
    .from('ventes')
    .insert([venteData])
    .select()
    .single();

  if (venteError) throw venteError;

  const lignesPayload = lignesCalculees.map((ligne) => ({
    entreprise_id: profile.entreprise_id,
    vente_id: vente.id,
    produit_id: ligne.produit_id,
    quantite: ligne.quantite,
    prix_unitaire: ligne.prix_unitaire,
    prix_achat_unitaire: ligne.prix_achat_unitaire,
    sous_total: ligne.sous_total,
    cout_total: ligne.cout_total,
    benefice_ligne: ligne.benefice_ligne,
  }));

  const { error: lignesError } = await supabase
    .from('vente_lignes')
    .insert(lignesPayload);

  if (lignesError) throw lignesError;

  for (const ligne of lignesCalculees) {
    const produit = produitsMap.get(ligne.produit_id);
    const nouveauStock = toNumber(produit.stock) - ligne.quantite;

    const { error: updateStockError } = await supabase
      .from('produits')
      .update({ stock: nouveauStock })
      .eq('id', ligne.produit_id)
      .eq('entreprise_id', profile.entreprise_id);

    if (updateStockError) throw updateStockError;

    const { error: mouvementError } = await supabase
      .from('mouvements_stock')
      .insert([
        {
          entreprise_id: profile.entreprise_id,
          produit_id: ligne.produit_id,
          type_mouvement: 'sortie',
          quantite: ligne.quantite,
          note: `Sortie automatique après vente #${vente.id}`,
        },
      ]);

    if (mouvementError) throw mouvementError;
  }

  return vente;
}

export async function updateVente(venteId, payload) {
  const profile = await getMyProfile();

  await findOrCreateClientFromSale(profile, payload);

  const fraisLivraison = toNumber(payload.fraisLivraison);

  const venteData = {
    nomClient: normalizeText(payload.nomClient),
    prenomClient: normalizeText(payload.prenomClient) || null,
    telephone: normalizeText(payload.telephone) || null,
    adresse: normalizeText(payload.adresse) || null,
    statut: payload.statut || 'payee',
    dateAchat: payload.dateAchat || null,
    fraisLivraison,
  };

  const { data, error } = await supabase
    .from('ventes')
    .update(venteData)
    .eq('id', venteId)
    .eq('entreprise_id', profile.entreprise_id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteVente(venteId) {
  const profile = await getMyProfile();

  const { data: vente, error: venteError } = await supabase
    .from('ventes')
    .select('*')
    .eq('id', venteId)
    .eq('entreprise_id', profile.entreprise_id)
    .single();

  if (venteError) throw venteError;

  const { data: lignes, error: lignesError } = await supabase
    .from('vente_lignes')
    .select('*')
    .eq('vente_id', venteId)
    .eq('entreprise_id', profile.entreprise_id);

  if (lignesError) throw lignesError;

  const produitIds = [...new Set((lignes || []).map((ligne) => Number(ligne.produit_id)))];

  if (produitIds.length > 0) {
    const { data: produits, error: produitsError } = await supabase
      .from('produits')
      .select('*')
      .eq('entreprise_id', profile.entreprise_id)
      .in('id', produitIds);

    if (produitsError) throw produitsError;

    const produitsMap = new Map((produits || []).map((produit) => [Number(produit.id), produit]));

    for (const ligne of lignes || []) {
      const produit = produitsMap.get(Number(ligne.produit_id));
      if (!produit) continue;

      const nouveauStock = toNumber(produit.stock) + toNumber(ligne.quantite);

      const { error: stockError } = await supabase
        .from('produits')
        .update({ stock: nouveauStock })
        .eq('id', ligne.produit_id)
        .eq('entreprise_id', profile.entreprise_id);

      if (stockError) throw stockError;

      const { error: mouvementError } = await supabase
        .from('mouvements_stock')
        .insert([
          {
            entreprise_id: profile.entreprise_id,
            produit_id: ligne.produit_id,
            type_mouvement: 'entree',
            quantite: ligne.quantite,
            note: `Retour automatique après suppression vente #${venteId}`,
          },
        ]);

      if (mouvementError) throw mouvementError;
    }
  }

  const { error: deleteLignesError } = await supabase
    .from('vente_lignes')
    .delete()
    .eq('vente_id', venteId)
    .eq('entreprise_id', profile.entreprise_id);

  if (deleteLignesError) throw deleteLignesError;

  const { error: deleteVenteError } = await supabase
    .from('ventes')
    .delete()
    .eq('id', venteId)
    .eq('entreprise_id', profile.entreprise_id);

  if (deleteVenteError) throw deleteVenteError;

  return true;
}