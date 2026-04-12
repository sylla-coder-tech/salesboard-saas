import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { signInWithEmail } from '../services/authService';
import { getMyProfile } from '../services/profileService';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const invitationToken = searchParams.get('invitation_token');
  const invitationEmail = searchParams.get('invitation_email');

  const [email, setEmail] = useState(invitationEmail || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      await signInWithEmail(email, password);

      if (invitationToken) {
        navigate(`/accept-invitation?token=${encodeURIComponent(invitationToken)}`);
        return;
      }

      const profile = await getMyProfile();

      if (profile?.role_plateforme === 'super_admin') {
        navigate('/admin-saas');
        return;
      }

      navigate('/dashboard');
    } catch (error) {
      setErrorMsg(error.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-shell">
        <section className="login-hero">
          <div className="login-hero-top">
            <div className="login-eyebrow">Plateforme SaaS de gestion commerciale</div>

            <h1>
              Une expérience de gestion commerciale pensée pour inspirer confiance,
              clarté et performance.
            </h1>

            <p>
              SalesBoard centralise les ventes, le stock, les crédits, les dépenses,
              les rapports et l’analyse dans une interface premium, pensée pour les
              entreprises, boutiques, magasins et grossistes.
            </p>

           <div className="login-badges notranslate" translate="no">
  <div className="login-badges-row">
    <span className="login-badge">Ventes</span>
    <span className="login-badge">Stock</span>
  </div>

  <div className="login-badges-row">
    <span className="login-badge">Crédits</span>
    <span className="login-badge">Factures</span>
  </div>

  <div className="login-badges-row">
    <span className="login-badge">Rapports</span>
    <span className="login-badge">Analyse</span>
  </div>
</div>
          </div>

          <div className="login-hero-bottom">
            <div className="trust-grid">
              <div className="trust-item">
                <strong>Multi-entreprises</strong>
                <span>Un espace dédié pour chaque structure</span>
              </div>

              <div className="trust-item">
                <strong>Sécurisé</strong>
                <span>Accès contrôlé et données isolées</span>
              </div>

              <div className="trust-item">
                <strong>Professionnel</strong>
                <span>Une expérience conçue pour inspirer confiance</span>
              </div>
            </div>
          </div>
        </section>

        <section className="login-panel">
          <form className="login-card" onSubmit={handleSubmit}>
            <div className="login-header">
              <div className="login-header-top">
                <span className="login-panel-label">Accès sécurisé</span>
              </div>

              <h2>Connexion</h2>

              <p className="muted">
                Connectez-vous pour accéder à votre espace professionnel et piloter
                votre activité avec précision.
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

            <div className="form-group">
              <label>Mot de passe</label>
              <input
                type="password"
                placeholder="Votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {errorMsg ? <p className="error-text">{errorMsg}</p> : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Link
                to="/forgot-password"
                style={{ fontSize: '0.9rem', color: '#475467' }}
              >
                Mot de passe oublié ?
              </Link>
            </div>

            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>

            <div className="login-footnote">
              <span>Connexion réservée aux comptes autorisés.</span>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}