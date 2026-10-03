import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from '../services/authService';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await sendPasswordResetEmail(email);
      setSuccessMsg('Un email de réinitialisation a été envoyé.');
    } catch (error) {
      setErrorMsg(error.message || 'Erreur lors de l’envoi de l’email.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-shell">
        <section className="login-hero">
          <div className="login-hero-top">
            <div className="login-eyebrow">Récupération du compte</div>

            <h1>Réinitialisez votre mot de passe en toute simplicité.</h1>

            <p>
              Entrez l’adresse email liée à votre compte. Un lien sécurisé vous
              sera envoyé pour définir un nouveau mot de passe.
            </p>
          </div>
        </section>

        <section className="login-panel">
          <form className="login-card" onSubmit={handleSubmit}>
            <div className="login-header">
              <div className="login-header-top">
                <span className="login-panel-label">Mot de passe oublié</span>
              </div>

              <h2>Réinitialisation</h2>

              <p className="muted">
                Saisissez votre email pour recevoir un lien de réinitialisation.
              </p>
            </div>

            <div className="form-group">
              <label>Adresse email</label>
              <input
                type="email"
                placeholder="exemple@entreprise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {errorMsg ? <p className="error-text">{errorMsg}</p> : null}
            {successMsg ? (
              <p style={{ color: '#15803d', margin: 0 }}>
                {successMsg}
              </p>
            ) : null}

            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </button>

            <div className="login-footnote">
              <Link to="/">Retour à la connexion</Link>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}