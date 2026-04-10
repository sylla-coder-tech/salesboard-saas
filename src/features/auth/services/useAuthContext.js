import { useEffect, useState } from 'react';
import {
  getMyProfile,
  getMyEntreprise,
  getMyBilanEntreprise,
} from './profileService';

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

        // Cas sans profil
        if (!currentProfile) {
          setEntreprise(null);
          setBilan(null);
          return;
        }

        // Cas super admin ou utilisateur sans entreprise liée
        if (!currentProfile.entreprise_id) {
          setEntreprise(null);
          setBilan(null);
          return;
        }

        const currentEntreprise = await getMyEntreprise(currentProfile.entreprise_id);
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

    return () => {
      mounted = false;
    };
  }, []);

  return {
    loading,
    profile,
    entreprise,
    bilan,
    error,
  };
}