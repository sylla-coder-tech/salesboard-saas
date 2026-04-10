import { supabase } from '../../../lib/supabaseClient';
import { getMyProfile } from '../../auth/services/profileService';

export async function getProduits() {
  const profile = await getMyProfile();

  const { data, error } = await supabase
    .from('produits')
    .select('*')
    .eq('entreprise_id', profile.entreprise_id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

async function uploadProduitImage(file, entrepriseId) {
  if (!file) return null;

  const fileExt = file.name.split('.').pop();
  const fileName = `${entrepriseId}-${Date.now()}.${fileExt}`;
  const filePath = `produits/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('produits-images')
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('produits-images')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export async function addProduit(payload) {
  const profile = await getMyProfile();

  let imageUrl = null;

  if (payload.imageFile) {
    imageUrl = await uploadProduitImage(payload.imageFile, profile.entreprise_id);
  }

  const produitData = {
    entreprise_id: profile.entreprise_id,
    reference: payload.reference,
    nom: payload.nom,
    prixUnitaire: Number(payload.prixUnitaire || 0),
    stock: Number(payload.stock || 0),
    image_url: imageUrl,
  };

  const { data, error } = await supabase
    .from('produits')
    .insert([produitData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProduit(produitId, payload) {
  const profile = await getMyProfile();

  let imageUrl = payload.currentImageUrl || null;

  if (payload.imageFile) {
    imageUrl = await uploadProduitImage(payload.imageFile, profile.entreprise_id);
  }

  const produitData = {
    reference: payload.reference,
    nom: payload.nom,
    prixUnitaire: Number(payload.prixUnitaire || 0),
    stock: Number(payload.stock || 0),
    image_url: imageUrl,
  };

  const { data, error } = await supabase
    .from('produits')
    .update(produitData)
    .eq('id', produitId)
    .eq('entreprise_id', profile.entreprise_id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProduit(produitId) {
  const profile = await getMyProfile();

  const { error } = await supabase
    .from('produits')
    .delete()
    .eq('id', produitId)
    .eq('entreprise_id', profile.entreprise_id);

  if (error) throw error;
  return true;
}