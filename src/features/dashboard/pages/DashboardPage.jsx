import { useAuthContextData } from '../../auth/services/useAuthContext';

function formatGNF(value) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0)) + ' GNF';
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
          <div className="kpi-meta">Somme des articles vendus</div>
        </article>

        <article className="kpi-card">
          <div className="kpi-label">Ventes encaissées</div>
          <div className="kpi-value">{formatGNF(bilan?.ventes_encaissees)}</div>
          <div className="kpi-meta">Montants facturés réellement encaissés</div>
        </article>

        <article className="kpi-card">
          <div className="kpi-label">Coût total des ventes</div>
          <div className="kpi-value">{formatGNF(bilan?.cout_total_ventes)}</div>
          <div className="kpi-meta">Coût d’achat total des produits vendus</div>
        </article>

        <article className="kpi-card">
          <div className="kpi-label">Bénéfice net des ventes</div>
          <div className="kpi-value">{formatGNF(bilan?.benefice_net_ventes)}</div>
          <div className="kpi-meta">Bénéfice après coût d’achat et livraison</div>
        </article>

        <article className="kpi-card kpi-card-highlight">
          <div className="kpi-label">Argent disponible</div>
          <div className="kpi-value">{formatGNF(bilan?.caisse_nette_reelle)}</div>
          <div className="kpi-meta">Bénéfice net + remboursements - dépenses</div>
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
              <span>Argent disponible</span>
              <strong>{formatGNF(bilan?.caisse_nette_reelle)}</strong>
            </div>

            <div className="dashboard-insight-item">
              <span>Bénéfice net ventes</span>
              <strong>{formatGNF(bilan?.benefice_net_ventes)}</strong>
            </div>

            <div className="dashboard-insight-item">
              <span>Argent à récupérer</span>
              <strong>{formatGNF(bilan?.credits_en_cours)}</strong>
            </div>

            <div className="dashboard-insight-note">
              L’argent disponible correspond au bénéfice net des ventes, augmenté des remboursements
              reçus, puis diminué des dépenses. L’argent à récupérer correspond aux crédits clients
              non encore soldés.
            </div>
          </div>
        </article>
      </section>
    </>
  );
}