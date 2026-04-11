import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import {
  getInvitationByToken,
  isInvitationExpired,
  signOutUser,
} from '../services/authService';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR');
}

function formatRole(role) {
  if (role === 'owner') return 'Propriétaire';
  if (role === 'admin') return 'Administrateur';
  if (role === 'vendeur') return 'Vendeur';
  if (role === 'comptable') return 'Comptable';
  if (role === 'lecteur') return 'Lecteur';
  return role || '-';
}

function buildDisplayName(email) {
  if (!email) return 'Utilisateur';
  return email.split('@')[0];
}

export default function AcceptInvitationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const queryToken = searchParams.get('token');
  const confirmationUrl = searchParams.get('confirmation_url');

  const hashParams = new URLSearchParams(
    window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash
  );

  const hashError = hashParams.get('error');
  const hashErrorCode = hashParams.get('error_code');
  const hashErrorDescription = hashParams.get('error_description');

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [continuing, setContinuing] = useState(false);

  const [form, setForm] = useState({
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (!mounted) return;
        setSession(currentSession || null);
      } catch (err) {
        if (!mounted) return;
        console.error('Erreur session invitation:', err);
      }
    }

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return;
      setSession(currentSession || null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const invitationToken = useMemo(() => {
    return (
      queryToken ||
      session?.user?.user_metadata?.invitation_token ||
      session?.user?.app_metadata?.invitation_token ||
      null
    );
  }, [queryToken, session]);

  useEffect(() => {
    let mounted = true;

    async function loadInvitation() {
      try {
        setLoading(true);
        setError('');

        if (!invitationToken) {
          setInvitation(null);
          return;
        }

        const data = await getInvitationByToken(invitationToken);

        if (!mounted) return;
        setInvitation(data);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || 'Impossible de charger cette invitation.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (hashError || hashErrorCode) {
      setLoading(false);
      return;
    }

    if (invitationToken) {
      loadInvitation();
    } else {
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [invitationToken, hashError, hashErrorCode]);

  const expired = useMemo(() => {
    return isInvitationExpired(invitation?.expire_at);
  }, [invitation]);

  const invalidStatus = useMemo(() => {
    if (!invitation) return false;
    return invitation.statut !== 'en_attente';
  }, [invitation]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleBackToLogin() {
    try {
      await signOutUser();
    } catch (err) {
      console.error('Erreur déconnexion:', err);
    } finally {
      navigate('/');
    }
  }

  async function handleContinueInvitation() {
    try {
      setContinuing(true);
      setError('');

      if (!confirmationUrl) {
        throw new Error("Lien de confirmation introuvable.");
      }

      window.location.href = confirmationUrl;
    } catch (err) {
      setError(err.message || "Impossible de continuer l'invitation.");
      setContinuing(false);
    }
  }

  async function handleActivateAccount(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      const {
        data: { session: freshSession },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!freshSession?.user) {
        throw new Error(
          "Session utilisateur introuvable. Cliquez d'abord sur « Continuer l’invitation » depuis le lien reçu par email."
        );
      }

      if (!invitation) {
        throw new Error('Invitation introuvable.');
      }

      if (expired) {
        throw new Error('Cette invitation a expiré.');
      }

      if (invalidStatus) {
        throw new Error('Cette invitation n’est plus disponible.');
      }

      const invitedEmail = String(invitation.email || '').trim().toLowerCase();
      const currentEmail = String(freshSession.user.email || '').trim().toLowerCase();

      if (!currentEmail || currentEmail !== invitedEmail) {
        throw new Error(
          "Le compte connecté ne correspond pas à l’email invité."
        );
      }

      if (!form.password || form.password.length < 6) {
        throw new Error('Le mot de passe doit contenir au moins 6 caractères.');
      }

      if (form.password !== form.confirmPassword) {
        throw new Error('Les deux mots de passe ne correspondent pas.');
      }

      const { error: passwordError } = await supabase.auth.updateUser({
        password: form.password,
      });

      if (passwordError) throw passwordError;

      const displayName =
        freshSession.user.user_metadata?.nom_complet ||
        freshSession.user.user_metadata?.full_name ||
        buildDisplayName(freshSession.user.email);

      const { error: profileError } = await supabase
        .from('profils')
        .upsert(
          {
            id: freshSession.user.id,
            entreprise_id: invitation.entreprise_id,
            role: invitation.role,
            nom_complet: displayName,
            role_plateforme: null,
          },
          { onConflict: 'id' }
        );

      if (profileError) throw profileError;

      const { error: memberError } = await supabase
        .from('membres_entreprise')
        .upsert(
          {
            entreprise_id: invitation.entreprise_id,
            user_id: freshSession.user.id,
            role: invitation.role,
            statut: 'actif',
            date_invitation: invitation.created_at || new Date().toISOString(),
            date_activation: new Date().toISOString(),
          },
          { onConflict: 'entreprise_id,user_id' }
        );

      if (memberError) throw memberError;

      const { error: invitationUpdateError } = await supabase
        .from('invitations_entreprise')
        .update({
          statut: 'acceptee',
        })
        .eq('id', invitation.id);

      if (invitationUpdateError) throw invitationUpdateError;

      setSuccessMsg('Compte activé avec succès. Redirection en cours...');

      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Impossible d’activer ce compte.');
    } finally {
      setSubmitting(false);
    }
  }

  if (hashError || hashErrorCode) {
    return (
      <section className="auth-page-shell">
        <div className="auth-card">
          <h1>Invitation entreprise</h1>
          <p className="error-text">
            {hashErrorDescription || 'Ce lien d’invitation est invalide ou expiré.'}
          </p>
          <button
            type="button"
            className="primary-btn"
            onClick={handleBackToLogin}
          >
            Retour à la connexion
          </button>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="auth-page-shell">
        <div className="auth-card">
          <h1>Invitation entreprise</h1>
          <p>Chargement de l’invitation...</p>
        </div>
      </section>
    );
  }

  if (error && !invitation) {
    return (
      <section className="auth-page-shell">
        <div className="auth-card">
          <h1>Invitation entreprise</h1>
          <p className="error-text">{error}</p>
          <button
            type="button"
            className="primary-btn"
            onClick={handleBackToLogin}
          >
            Retour à la connexion
          </button>
        </div>
      </section>
    );
  }

  if (!invitation) {
    return (
      <section className="auth-page-shell">
        <div className="auth-card">
          <h1>Invitation entreprise</h1>
          <p className="error-text">Invitation introuvable.</p>
          <button
            type="button"
            className="primary-btn"
            onClick={handleBackToLogin}
          >
            Retour à la connexion
          </button>
        </div>
      </section>
    );
  }

  if (expired) {
    return (
      <section className="auth-page-shell">
        <div className="auth-card">
          <h1>Invitation expirée</h1>
          <p>
            Cette invitation pour <strong>cette entreprise</strong> a expiré.
          </p>
          <p>Demandez une nouvelle invitation à l’administrateur.</p>
          <button
            type="button"
            className="primary-btn"
            onClick={handleBackToLogin}
          >
            Retour à la connexion
          </button>
        </div>
      </section>
    );
  }

  if (invalidStatus) {
    return (
      <section className="auth-page-shell">
        <div className="auth-card">
          <h1>Invitation non disponible</h1>
          <p>Cette invitation a déjà été utilisée ou n’est plus active.</p>
          <button
            type="button"
            className="primary-btn"
            onClick={handleBackToLogin}
          >
            Retour à la connexion
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-page-shell">
      <div className="auth-card">
        <div className="auth-badge">Invitation</div>

        <h1>Rejoindre une entreprise</h1>
        <p>Vous avez été invité à rejoindre l’espace entreprise ci-dessous.</p>

        <div className="invitation-summary-card">
          <div className="invitation-summary-item">
            <span>Entreprise ID</span>
            <strong>{invitation.entreprise_id || '-'}</strong>
          </div>

          <div className="invitation-summary-item">
            <span>Email invité</span>
            <strong>{invitation.email || '-'}</strong>
          </div>

          <div className="invitation-summary-item">
            <span>Rôle</span>
            <strong>{formatRole(invitation.role)}</strong>
          </div>

          <div className="invitation-summary-item">
            <span>Expire le</span>
            <strong>{formatDate(invitation.expire_at)}</strong>
          </div>
        </div>

        {!session?.user ? (
          <div className="auth-info-box">
            <p>
              Cliquez d’abord sur le bouton ci-dessous pour que la session
              d’invitation soit reconnue, puis définissez votre mot de passe.
            </p>

            {error ? <p className="error-text">{error}</p> : null}

            <div className="auth-actions-stack">
              <button
                type="button"
                className="primary-btn"
                onClick={handleContinueInvitation}
                disabled={continuing || !confirmationUrl}
              >
                {continuing ? 'Ouverture...' : 'Continuer l’invitation'}
              </button>

              <button
                type="button"
                className="secondary-outline-btn"
                onClick={handleBackToLogin}
              >
                Retour à la connexion
              </button>
            </div>
          </div>
        ) : (
          <form className="auth-form-stack" onSubmit={handleActivateAccount}>
            <div className="form-group">
              <label>Mot de passe</label>
              <input
                type="password"
                name="password"
                placeholder="Choisissez un mot de passe"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Confirmer le mot de passe</label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirmez le mot de passe"
                value={form.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            {error ? <p className="error-text">{error}</p> : null}
            {successMsg ? <p className="success-text">{successMsg}</p> : null}

            <div className="auth-actions-stack">
              <button className="primary-btn" type="submit" disabled={submitting}>
                {submitting ? 'Activation...' : 'Activer mon compte'}
              </button>

              <button
                type="button"
                className="secondary-outline-btn"
                onClick={handleBackToLogin}
              >
                Retour
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}