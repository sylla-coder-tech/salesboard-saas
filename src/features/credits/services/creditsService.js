import { supabase } from '../../../lib/supabaseClient';
import { getMyProfile } from '../../auth/services/profileService';

export async function getCreditsClients() {
  const profile = await getMyProfile();

  const { data, error } = await supabase
    .from('credits_clients')
    .select(`
      *,
      clients (
        id,
        nom,
        prenom,
        telephone
      )
    `)
    .eq('entreprise_id', profile.entreprise_id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getRemboursementsCredit() {
  const profile = await getMyProfile();

  const { data, error } = await supabase
    .from('remboursements_credit')
    .select(`
      *,
      credits_clients (
        id,
        client_id,
        produit_id,
        montant_total,
        montant_paye,
        reste_a_payer,
        clients (
          id,
          nom,
          prenom,
          telephone
        )
      )
    `)
    .eq('entreprise_id', profile.entreprise_id)
    .order('date_remboursement', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addCreditClient(payload) {
  const profile = await getMyProfile();

  const montantTotal = Number(payload.montant_credit || 0);
  const montantPaye = Number(payload.montant_verse || 0);
  const resteAPayer = montantTotal - montantPaye;

  if (montantTotal <= 0) {
    throw new Error('Le montant du crédit doit être supérieur à 0.');
  }

  if (montantPaye < 0) {
    throw new Error('Le montant versé ne peut pas être négatif.');
  }

  if (montantPaye > montantTotal) {
    throw new Error('Le montant versé ne peut pas dépasser le montant du crédit.');
  }

  const creditData = {
    entreprise_id: profile.entreprise_id,
    client_id: payload.client_id,
    produit_id: payload.produit_id || null,
    vente_id: null,
    montant_total: montantTotal,
    montant_paye: montantPaye,
    reste_a_payer: resteAPayer,
    statut: resteAPayer === 0 ? 'solde' : 'en cours',
    date_credit: payload.date_credit || new Date().toISOString(),
    date_echeance: payload.date_credit || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('credits_clients')
    .insert([creditData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function addRemboursementCredit(payload) {
  const profile = await getMyProfile();

  const montant = Number(payload.montant || 0);
  if (montant <= 0) {
    throw new Error('Le montant du remboursement doit être supérieur à 0.');
  }

  const { data: credit, error: creditError } = await supabase
    .from('credits_clients')
    .select('*')
    .eq('id', payload.credit_client_id)
    .eq('entreprise_id', profile.entreprise_id)
    .single();

  if (creditError) throw creditError;

  const resteActuel = Number(credit.reste_a_payer || 0);
  const payeActuel = Number(credit.montant_paye || 0);

  if (montant > resteActuel) {
    throw new Error('Le remboursement dépasse le montant restant.');
  }

  const nouveauMontantPaye = payeActuel + montant;
  const nouveauResteAPayer = resteActuel - montant;
  const nouveauStatut = nouveauResteAPayer === 0 ? 'solde' : 'en cours';

  const remboursementData = {
    entreprise_id: profile.entreprise_id,
    credit_id: payload.credit_client_id,
    montant,
    mode_paiement: payload.mode_paiement || 'espèces',
    note: payload.note || null,
    date_paiement: payload.date_remboursement || new Date().toISOString(),
    date_remboursement: payload.date_remboursement || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('remboursements_credit')
    .insert([remboursementData])
    .select()
    .single();

  if (error) throw error;

  const { error: updateError } = await supabase
    .from('credits_clients')
    .update({
      montant_paye: nouveauMontantPaye,
      reste_a_payer: nouveauResteAPayer,
      statut: nouveauStatut,
    })
    .eq('id', payload.credit_client_id)
    .eq('entreprise_id', profile.entreprise_id);

  if (updateError) throw updateError;

  return data;
}