import { useAuthContextData } from '../../auth/services/useAuthContext';

function formatGNF(value) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0)) + ' GNF';
}

function formatNumber(value) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0));
}

export default function DashboardPage() {
  const { loading, error, entreprise, bilan } = useAuthContextData();

  if (loading) {
    return (
      <section className="page-card">
        <h2>Dashboard</h2>
        <p>Chargement des données...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-card">
        <h2>Dashboard</h2>
        <p style={{ color: '#dc2626' }}>{error}</p>
      </section>
    );
  }

  return (
    <>
      <section className="page-card dashboard-hero-card">
        <div className="dashboard-hero-head">
          <div className="dashboard-hero-text">
            <h2>{entreprise?.nom || 'Entreprise'}</h2>
            <p>Vue globale de la performance commerciale actuelle.</p>
          </div>
        </div>
      </section>

      <section className="kpi-grid dashboard-kpi-grid">
        <article className="kpi-card">
          <div className="kpi-label">Chiffre d’affaires</div>
          <div className="kpi-value">{formatGNF(bilan?.chiffre_affaires)}</div>
          <div className="kpi-meta">Valeur totale des ventes enregistrées</div>
        </article>

        <article className="kpi-card">
          <div className="kpi-label">Ventes encaissées</div>
          <div className="kpi-value">{formatGNF(bilan?.ventes_encaissees)}</div>
          <div className="kpi-meta">Montants réellement reçus des clients</div>
        </article>

        <article className="kpi-card kpi-card-highlight">
          <div className="kpi-label">Caisse disponible</div>
          <div className="kpi-value">{formatGNF(bilan?.caisse_disponible)}</div>
          <div className="kpi-meta">
            Ventes encaissées + remboursements - dépenses - livraison
          </div>
        </article>

        <article className="kpi-card">
          <div className="kpi-label">Argent à récupérer</div>
          <div className="kpi-value">{formatGNF(bilan?.credits_en_cours)}</div>
          <div className="kpi-meta">Montants restant à récupérer auprès des clients</div>
        </article>

        <article className="kpi-card">
          <div className="kpi-label">Total remboursé</div>
          <div className="kpi-value">{formatGNF(bilan?.total_remboursements)}</div>
          <div className="kpi-meta">Sommes récupérées sur les crédits</div>
        </article>

        <article className="kpi-card">
          <div className="kpi-label">Dépenses</div>
          <div className="kpi-value">{formatGNF(bilan?.total_depenses)}</div>
          <div className="kpi-meta">Total des dépenses enregistrées</div>
        </article>

        <article className="kpi-card">
          <div className="kpi-label">Nombre total de ventes</div>
          <div className="kpi-value">{formatNumber(bilan?.nombre_total_ventes)}</div>
          <div className="kpi-meta">Nombre total de ventes effectuées</div>
        </article>

        <article className="kpi-card">
          <div className="kpi-label">Coût total des ventes</div>
          <div className="kpi-value">{formatGNF(bilan?.cout_total_ventes)}</div>
          <div className="kpi-meta">Valeur enregistrée selon votre mode de gestion</div>
        </article>
      </section>

      <section className="content-grid dashboard-content-grid">
        <article className="data-card">
          <div className="data-card-head">
            <div>
              <h3>Résumé financier</h3>
              <p>Lecture rapide des chiffres clés de l’entreprise</p>
            </div>
          </div>

          <div className="report-summary-list">
            <div className="report-summary-item">
              <span>Frais de livraison</span>
              <strong>{formatGNF(bilan?.total_livraison)}</strong>
            </div>

            <div className="report-summary-item">
              <span>Total crédits</span>
              <strong>{formatGNF(bilan?.total_credits)}</strong>
            </div>

            <div className="report-summary-item">
              <span>Déjà payé sur crédits</span>
              <strong>{formatGNF(bilan?.total_credits_payes)}</strong>
            </div>
          </div>
        </article>

        <article className="data-card dashboard-insight-card">
          <div className="data-card-head">
            <div>
              <h3>Lecture métier</h3>
              <p>Compréhension rapide de la situation actuelle</p>
            </div>
          </div>

          <div className="dashboard-insight-list">
            <div className="dashboard-insight-item">
              <span>Caisse disponible</span>
              <strong>{formatGNF(bilan?.caisse_disponible)}</strong>
            </div>

            <div className="dashboard-insight-item">
              <span>Ventes encaissées</span>
              <strong>{formatGNF(bilan?.ventes_encaissees)}</strong>
            </div>

            <div className="dashboard-insight-item">
              <span>Argent à récupérer</span>
              <strong>{formatGNF(bilan?.credits_en_cours)}</strong>
            </div>

            <div className="dashboard-insight-note">
              La caisse disponible correspond aux ventes encaissées, augmentées des remboursements
              reçus, puis diminuées des dépenses et des frais de livraison. L’argent à récupérer
              correspond aux crédits clients non encore soldés.
            </div>
          </div>
        </article>
      </section>
    </>
  );
}