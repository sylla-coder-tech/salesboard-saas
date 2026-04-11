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
  const cleanToken = String(token || '').trim();

  if (!cleanToken) {
    throw new Error("Token d'invitation introuvable.");
  }

  const { data, error } = await supabase.functions.invoke(
    'get-invitation-by-token',
    {
      body: { token: cleanToken },
    }
  );

  if (error) {
    throw new Error(
      data?.message || error.message || "Impossible de charger l'invitation."
    );
  }

  if (data?.error) {
    throw new Error(data.message || data.error);
  }

  if (!data?.invitation) {
    throw new Error('Invitation introuvable.');
  }

  return data.invitation;
}

export function isInvitationExpired(expireAt) {
  if (!expireAt) return true;
  return new Date(expireAt).getTime() < Date.now();
}