import { supabase } from '../../../lib/supabaseClient';

export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}

export async function sendPasswordResetEmail(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
   redirectTo: `${import.meta.env.VITE_APP_URL}/update-password`,
  });

  if (error) throw error;
  return data;
}

export async function updateUserPassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
  return data;
}

export async function getInvitationByToken(token) {
  const { data, error } = await supabase
    .from('invitations_entreprise')
    .select('id, email, role, statut, expire_at, entreprise_id, token')
    .eq('token', token)
    .single();

  if (error) throw error;
  return data;
}

export async function markInvitationAsAccepted(invitationId) {
  const { data, error } = await supabase
    .from('invitations_entreprise')
    .update({
      statut: 'acceptee',
    })
    .eq('id', invitationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function isInvitationExpired(expireAt) {
  if (!expireAt) return true;
  return new Date(expireAt).getTime() < Date.now();
}