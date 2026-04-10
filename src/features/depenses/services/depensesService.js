import { supabase } from '../../../lib/supabaseClient';
import { getMyProfile } from '../../auth/services/profileService';

export async function getDepenses() {
  const profile = await getMyProfile();

  const { data, error } = await supabase
    .from('depenses')
    .select('*')
    .eq('entreprise_id', profile.entreprise_id)
    .order('date_depense', { ascending: false });

  if (error) throw error;
  return data;
}

export async function addDepense(payload) {
  const profile = await getMyProfile();

  const depenseData = {
    entreprise_id: profile.entreprise_id,
    categorie: payload.categorie,
    montant: Number(payload.montant || 0),
    description: payload.description || null,
    date_depense: payload.date_depense || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('depenses')
    .insert([depenseData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDepense(depenseId, payload) {
  const profile = await getMyProfile();

  const depenseData = {
    categorie: payload.categorie,
    montant: Number(payload.montant || 0),
    description: payload.description || null,
    date_depense: payload.date_depense || null,
  };

  const { data, error } = await supabase
    .from('depenses')
    .update(depenseData)
    .eq('id', depenseId)
    .eq('entreprise_id', profile.entreprise_id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteDepense(depenseId) {
  const profile = await getMyProfile();

  const { error } = await supabase
    .from('depenses')
    .delete()
    .eq('id', depenseId)
    .eq('entreprise_id', profile.entreprise_id);

  if (error) throw error;
  return true;
}