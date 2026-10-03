import { supabase } from '../../../lib/supabaseClient';

export async function getMyProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) return null;

  const { data, error } = await supabase
    .from('profils')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function getMyEntreprise(entrepriseId) {
  if (!entrepriseId) return null;

  const { data, error } = await supabase
    .from('entreprises')
    .select('*')
    .eq('id', entrepriseId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function getMyBilanEntreprise(entrepriseId) {
  if (!entrepriseId) return null;

  const { data, error } = await supabase
    .from('bilan_entreprise')
    .select('*')
    .eq('entreprise_id', entrepriseId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}