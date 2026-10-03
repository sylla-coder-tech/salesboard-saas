import { supabase } from '../../../lib/supabaseClient';
import { getMyProfile } from '../../auth/services/profileService';

export async function getMouvementsStock() {
  const profile = await getMyProfile();

  const { data, error } = await supabase
    .from('mouvements_stock')
    .select(`
      *,
      produits (
        id,
        nom,
        reference
      )
    `)
    .eq('entreprise_id', profile.entreprise_id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function addMouvementStock(payload) {
  const profile = await getMyProfile();

  const { data: produit, error: produitError } = await supabase
    .from('produits')
    .select('*')
    .eq('id', payload.produit_id)
    .eq('entreprise_id', profile.entreprise_id)
    .single();

  if (produitError) throw produitError;

  const quantite = Number(payload.quantite || 0);
  let nouveauStock = Number(produit.stock || 0);

  if (payload.type_mouvement === 'entree') {
    nouveauStock += quantite;
  } else if (payload.type_mouvement === 'sortie') {
    if (quantite > nouveauStock) {
      throw new Error('Stock insuffisant pour effectuer cette sortie.');
    }
    nouveauStock -= quantite;
  } else if (payload.type_mouvement === 'ajustement') {
    nouveauStock = quantite;
  }

  const { error: mouvementError } = await supabase
    .from('mouvements_stock')
    .insert([
      {
        entreprise_id: profile.entreprise_id,
        produit_id: payload.produit_id,
        type_mouvement: payload.type_mouvement,
        quantite,
        note: payload.note || null,
      },
    ]);

  if (mouvementError) throw mouvementError;

  const { error: produitUpdateError } = await supabase
    .from('produits')
    .update({ stock: nouveauStock })
    .eq('id', payload.produit_id)
    .eq('entreprise_id', profile.entreprise_id);

  if (produitUpdateError) throw produitUpdateError;

  return true;
}