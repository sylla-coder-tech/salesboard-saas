import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { signOutUser, updateUserPassword } from '../services/authService';

export default function UpdatePasswordPage() {
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    let mounted = true;

    async function initRecoverySession() {
      try {
        setPageLoading(true);
        setErrorMsg('');

        const hashParams = new URLSearchParams(
          window.location.hash.startsWith('#')
            ? window.location.hash.slice(1)
            : window.location.hash
        );

        const hashError = hashParams.get('error');
        const hashErrorDescription = hashParams.get('error_description');

        if (hashError) {
          throw new Error(
            hashErrorDescription || 'Lien de réinitialisation invalide ou expiré.'
          );
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session) {
          setHasRecoverySession(true);
          setPageLoading(false);
          return;
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, sessionAfterAuth) => {
          if (!mounted) return;

          if (
            event === 'PASSWORD_RECOVERY' ||
            event === 'SIGNED_IN' ||
            sessionAfterAuth
          ) {
            setHasRecoverySession(Boolean(sessionAfterAuth));
            setPageLoading(false);
          }
        });

        setTimeout(async () => {
          if (!mounted) return;

          const {
            data: { session: retrySession },
          } = await supabase.auth.getSession();

          if (!mounted) return;

          if (retrySession) {
            setHasRecoverySession(true);
          } else {
            setHasRecoverySession(false);
            setErrorMsg('Session de réinitialisation introuvable ou expirée.');
          }

          setPageLoading(false);
          subscription.unsubscribe();
        }, 1200);
      } catch (error) {
        if (!mounted) return;
        setErrorMsg(
          error.message || 'Impossible de valider le lien de réinitialisation.'
        );
        setPageLoading(false);
      }
    }

    initRecoverySession();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!hasRecoverySession) {
      setErrorMsg('Session de réinitialisation introuvable ou expirée.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Les mots de passe ne correspondent pas.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setLoading(true);

    try {
      await updateUserPassword(password);
      setSuccessMsg('Mot de passe mis à jour avec succès.');

      setTimeout(async () => {
        await signOutUser();
        navigate('/');
      }, 1500);
    } catch (error) {
      setErrorMsg(
        error.message || 'Impossible de mettre à jour le mot de passe.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-shell">
        <section className="login-hero">
          <div className="login-hero-top">
            <div className="login-eyebrow">Sécurisation du compte</div>
            <h1>Choisissez un nouveau mot de passe sécurisé.</h1>
            <p>
              Définissez un nouveau mot de passe pour retrouver l’accès à votre
              espace de gestion.
            </p>
          </div>
        </section>

        <section className="login-panel">
          <form className="login-card" onSubmit={handleSubmit}>
            <div className="login-header">
              <div className="login-header-top">
                <span className="login-panel-label">Nouveau mot de passe</span>
              </div>

              <h2>Mise à jour</h2>

              <p className="muted">
                Choisissez un mot de passe fort pour sécuriser votre compte.
              </p>
            </div>

            {pageLoading ? (
              <p>Vérification du lien de réinitialisation...</p>
            ) : (
              <>
                <div className="form-group">
                  <label>Nouveau mot de passe</label>
                  <input
                    type="password"
                    placeholder="Votre nouveau mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={!hasRecoverySession}
                  />
                </div>

                <div className="form-group">
                  <label>Confirmer le mot de passe</label>
                  <input
                    type="password"
                    placeholder="Confirmez votre mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={!hasRecoverySession}
                  />
                </div>

                {errorMsg ? <p className="error-text">{errorMsg}</p> : null}
                {successMsg ? (
                  <p style={{ color: '#15803d', margin: 0 }}>{successMsg}</p>
                ) : null}

                <button
                  className="primary-btn"
                  type="submit"
                  disabled={loading || !hasRecoverySession}
                >
                  {loading ? 'Mise à jour...' : 'Mettre à jour'}
                </button>
              </>
            )}
          </form>
        </section>
      </div>
    </div>
  );
}