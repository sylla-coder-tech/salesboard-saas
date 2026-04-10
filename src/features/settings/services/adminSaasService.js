import { supabase } from '../../../lib/supabaseClient';

function normalizeId(value) {
  return String(value ?? '').trim();
}

export async function getEntreprisesSaas() {
  const { data, error } = await supabase
    .from('entreprises_saas_overview')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPlansAbonnement() {
  const { data, error } = await supabase
    .from('plans_abonnement')
    .select('*')
    .order('id', { ascending: true });

  if (error) throw error;
  return data || [];
}

function getPlanCode(payload) {
  return payload?.code_plan || payload?.code || payload?.plan_abonnement || 'basic';
}

function getPlanConfig(codePlan) {
  if (codePlan === 'premium') {
    return {
      max_utilisateurs: 50,
      ia_active: true,
      ia_niveau: 'premium',
      rapports_avances_actifs: true,
      credits_actifs: true,
      factures_actives: true,
    };
  }

  if (codePlan === 'pro') {
    return {
      max_utilisateurs: 10,
      ia_active: true,
      ia_niveau: 'pro',
      rapports_avances_actifs: true,
      credits_actifs: true,
      factures_actives: true,
    };
  }

  return {
    max_utilisateurs: 3,
    ia_active: false,
    ia_niveau: 'none',
    rapports_avances_actifs: false,
    credits_actifs: true,
    factures_actives: false,
  };
}

export async function createEntrepriseSaas(payload) {
  const plans = await getPlansAbonnement();

  const selectedPlan = plans.find(
    (plan) => normalizeId(plan.id) === normalizeId(payload.plan_id)
  );

  if (!selectedPlan) {
    throw new Error('Plan abonnement introuvable.');
  }

  const planCode = getPlanCode(selectedPlan);
  const planConfig = getPlanConfig(planCode);

  const entrepriseData = {
    nom: payload.nom?.trim(),
    telephone: payload.telephone?.trim() || null,
    adresse: payload.adresse?.trim() || null,
    description: payload.description?.trim() || null,
    plan_abonnement: planCode,
    statut_abonnement: payload.statut_abonnement || 'essai',
    date_debut_abonnement: new Date().toISOString(),
    date_fin_abonnement: payload.date_fin_abonnement || null,
    ...planConfig,
  };

  const { data, error } = await supabase
    .from('entreprises')
    .insert([entrepriseData])
    .select()
    .single();

  if (error) throw error;

  return {
    success: true,
    message: 'Entreprise créée avec succès.',
    data,
  };
}

export async function updateEntreprisePlan(entrepriseId, planId) {
  if (!entrepriseId || !planId) {
    throw new Error('Entreprise et plan sont obligatoires.');
  }

  const plans = await getPlansAbonnement();

  const selectedPlan = plans.find(
    (plan) => normalizeId(plan.id) === normalizeId(planId)
  );

  if (!selectedPlan) {
    throw new Error('Plan abonnement introuvable.');
  }

  const planCode = getPlanCode(selectedPlan);
  const planConfig = getPlanConfig(planCode);

  const updateData = {
    plan_abonnement: planCode,
    ...planConfig,
  };

  const { data, error } = await supabase
    .from('entreprises')
    .update(updateData)
    .eq('id', entrepriseId)
    .select()
    .single();

  if (error) throw error;

  return {
    success: true,
    message: 'Plan mis à jour avec succès.',
    data,
  };
}

export async function updateEntrepriseStatus(entrepriseId, statutAbonnement) {
  if (!entrepriseId || !statutAbonnement) {
    throw new Error('Entreprise et statut sont obligatoires.');
  }

  const { data, error } = await supabase
    .from('entreprises')
    .update({ statut_abonnement: statutAbonnement })
    .eq('id', entrepriseId)
    .select()
    .single();

  if (error) throw error;

  return {
    success: true,
    message: 'Statut mis à jour avec succès.',
    data,
  };
}

export async function inviteCompanyOwner(payload) {
  const { entreprise_id, email, role = 'owner' } = payload || {};

  if (!entreprise_id || !email) {
    throw new Error('Entreprise et email sont obligatoires.');
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
      entreprise_id,
      email,
      role,
      redirectTo: `${import.meta.env.VITE_APP_URL}/accept-invitation`,
    },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    throw new Error(data?.message || error.message || "Erreur lors de l'appel de la fonction.");
  }

  if (data?.error) {
    throw new Error(data.message || data.error);
  }

  return data;
}

export async function deleteInvitationById(invitationId) {
  if (!invitationId) {
    throw new Error("ID d'invitation manquant.");
  }

  const { error } = await supabase
    .from('invitations_entreprise')
    .delete()
    .eq('id', invitationId);

  if (error) throw error;

  return {
    success: true,
    message: 'Invitation supprimée avec succès.',
  };
}