import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { getMyProfile, getMyEntreprise, getMyBilanEntreprise } from './profileService';

async function checkAndExpireTrialIfNeeded(entreprise) {
  if (!entreprise) return entreprise;
  const statut = String(entreprise.statut_abonnement || '').toLowerCase();
  if (statut !== 'essai') return entreprise;
  const dateFin = entreprise.date_fin_abonnement;
  if (!dateFin) return entreprise;
  if (new Date() <= new Date(dateFin)) return entreprise;
  const { error } = await supabase
    .from('entreprises')
    .update({ statut_abonnement: 'expire' })
    .eq('id', entreprise.id);
  if (error) { console.error('Erreur expiration essai :', error.message); return entreprise; }
  return { ...entreprise, statut_abonnement: 'expire' };
}

export function useAuthContextData() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [entreprise, setEntreprise] = useState(null);
  const [bilan, setBilan] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function loadContext() {
      try {
        setLoading(true);
        setError('');
        const currentProfile = await getMyProfile();
        if (!mounted) return;
        setProfile(currentProfile);
        if (!currentProfile) { setEntreprise(null); setBilan(null); return; }
        if (!currentProfile.entreprise_id) { setEntreprise(null); setBilan(null); return; }
        let currentEntreprise = await getMyEntreprise(currentProfile.entreprise_id);
        if (!mounted) return;
        currentEntreprise = await checkAndExpireTrialIfNeeded(currentEntreprise);
        if (!mounted) return;
        setEntreprise(currentEntreprise);
        const currentBilan = await getMyBilanEntreprise(currentProfile.entreprise_id);
        if (!mounted) return;
        setBilan(currentBilan);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || 'Erreur de chargement du contexte utilisateur');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadContext();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT') { setProfile(null); setEntreprise(null); setBilan(null); setLoading(false); return; }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') { loadContext(); }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  return { loading, profile, entreprise, bilan, error };
}