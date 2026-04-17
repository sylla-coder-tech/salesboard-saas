import { supabase } from '../../../lib/supabaseClient';
import { getMyProfile } from '../../auth/services/profileService';

export async function getTeamMembers() {
  const profile = await getMyProfile();

  if (!profile?.entreprise_id) {
    throw new Error("Entreprise introuvable pour l'utilisateur connecté.");
  }

  const { data, error } = await supabase
    .from('membres_entreprise')
    .select(`
      id,
      entreprise_id,
      user_id,
      role,
      statut,
      date_invitation,
      date_activation,
      profils:user_id (
        id,
        nom_complet
      ),
      entreprises:entreprise_id (
        id,
        nom
      )
    `)
    .eq('entreprise_id', profile.entreprise_id)
    .order('date_activation', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function inviteTeamMember(payload) {
  const profile = await getMyProfile();
  const { email, role } = payload || {};

  if (!email || !role) {
    throw new Error('Email et rôle sont obligatoires.');
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session?.access_token) {
    throw new Error('Session utilisateur introuvable.');
  }

  const { data, error } = await supabase.functions.invoke('invite-company-user', {
    body: {
      entreprise_id: profile.entreprise_id,
      email,
      role,
      redirectTo: `${import.meta.env.VITE_APP_URL}/accept-invitation`,
    },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    throw new Error(data?.message || error.message || "Erreur lors de l'invitation.");
  }

  if (data?.error) {
    throw new Error(data.message || data.error);
  }

  return data;
}

export async function updateTeamMember(memberId, payload) {
  const { data, error } = await supabase
    .from('membres_entreprise')
    .update(payload)
    .eq('id', memberId)
    .select()
    .single();

  if (error) throw error;
  return data;
}