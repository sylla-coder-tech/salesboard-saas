import { supabase } from '../../../lib/supabaseClient';
import { getMyProfile } from '../../auth/services/profileService';

export async function getClients() {
  const profile = await getMyProfile();

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('entreprise_id', profile.entreprise_id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addClient(payload) {
  const profile = await getMyProfile();

  const clientData = {
    entreprise_id: profile.entreprise_id,
    nom: payload.nom,
    prenom: payload.prenom || null,
    telephone: payload.telephone || null,
    adresse: payload.adresse || null,
  };

  const { data, error } = await supabase
    .from('clients')
    .insert([clientData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateClient(clientId, payload) {
  const profile = await getMyProfile();

  const clientData = {
    nom: payload.nom,
    prenom: payload.prenom || null,
    telephone: payload.telephone || null,
    adresse: payload.adresse || null,
  };

  const { data, error } = await supabase
    .from('clients')
    .update(clientData)
    .eq('id', clientId)
    .eq('entreprise_id', profile.entreprise_id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteClient(clientId) {
  const profile = await getMyProfile();

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', clientId)
    .eq('entreprise_id', profile.entreprise_id);

  if (error) throw error;
  return true;
}