import { supabase } from '../../../lib/supabaseClient';
import { getMyProfile } from '../../auth/services/profileService';

export async function getEntrepriseSettings() {
  const profile = await getMyProfile();

  const { data, error } = await supabase
    .from('entreprises')
    .select('*')
    .eq('id', profile.entreprise_id)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function uploadEntrepriseLogo(profile, file) {
  if (!file) return null;

  const fileExt = file.name.split('.').pop();
  const fileName = `${profile.entreprise_id}-${Date.now()}.${fileExt}`;
  const filePath = `logos/${fileName}`;

  console.log('UPLOAD FILE PATH:', filePath);

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('entreprises-logos')
    .upload(filePath, file, { upsert: true });

  console.log('UPLOAD DATA:', uploadData);
  console.log('UPLOAD ERROR:', uploadError);

  if (uploadError) {
    throw new Error(`Erreur upload logo: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from('entreprises-logos')
    .getPublicUrl(filePath);

  console.log('PUBLIC URL DATA:', publicUrlData);

  if (!publicUrlData?.publicUrl) {
    throw new Error('Impossible de récupérer l’URL publique du logo.');
  }

  return publicUrlData.publicUrl;
}

export async function updateEntrepriseSettings(payload) {
  const profile = await getMyProfile();

  console.log('PROFILE SETTINGS:', profile);
  console.log('PAYLOAD SETTINGS:', payload);

  let finalLogoUrl = payload.currentLogoUrl || null;

  if (payload.logoFile) {
    finalLogoUrl = await uploadEntrepriseLogo(profile, payload.logoFile);
  }

  console.log('FINAL LOGO URL:', finalLogoUrl);

  const updateData = {
    nom: payload.nom || null,
    telephone: payload.telephone || null,
    adresse: payload.adresse || null,
    description: payload.description || null,
    logo_url: finalLogoUrl,
  };

  console.log('UPDATE DATA:', updateData);

  const { data, error } = await supabase
    .from('entreprises')
    .update(updateData)
    .eq('id', profile.entreprise_id)
    .select();

  console.log('UPDATE RESULT DATA:', data);
  console.log('UPDATE RESULT ERROR:', error);

  if (error) {
    throw new Error(`Erreur mise à jour entreprise: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error("Aucune entreprise n'a été mise à jour.");
  }

  return data[0];
}