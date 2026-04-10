import { useEffect, useMemo, useState } from 'react';
import {
  getAiCommercialData,
  getProductRevenueAnalysis,
} from '../services/aiService';

function formatGNF(value) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0)) + ' GNF';
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR');
}

const periodOptions = [
  { value: 'today', label: "Aujourd'hui" },
  { value: '7days', label: '7 derniers jours' },
  { value: '30days', label: '30 derniers jours' },
  { value: 'year', label: 'Cette année' },
];

export default function AiAssistantPage() {
  const [period, setPeriod] = useState('30days');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiData, setAiData] = useState(null);

  const [productSearch, setProductSearch] = useState('');
  const [productAnalysis, setProductAnalysis] = useState(null);
  const [productError, setProductError] = useState('');

  async function loadAiData(selectedPeriod) {
    try {
      setLoading(true);
      setError('');
      const data = await getAiCommercialData(selectedPeriod);
      setAiData(data);
    } catch (err) {
      setError(err.message || "Erreur lors du chargement de l'assistant IA.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAiData(period);
  }, [period]);

  const iaLabel = useMemo(() => {
    const niveau = String(aiData?.entreprise?.ia_niveau || '').toLowerCase();

    if (niveau === 'premium') return 'IA Premium';
    if (niveau === 'pro') return 'IA Pro';
    return 'IA non disponible';
  }, [aiData]);

  function handleAnalyseProduit(e) {
    e.preventDefault();
    setProductError('');
    setProductAnalysis(null);

    try {
      const result = getProductRevenueAnalysis(aiData, productSearch);
      setProductAnalysis(result);
    } catch (err) {
      setProductError(err.message || 'Erreur lors de l’analyse du produit.');
    }
  }

  return (
    <>
      <section className="page-card">
        <div className="section-head">
          <div>
            <h2>Assistant IA Commercial</h2>
            <p>
              Analyse intelligente de votre activité commerciale, de vos produits,
              de votre rentabilité et de votre trésorerie.
            </p>
          </div>

          <div className="report-filter-box">
            <label>Période</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="report-select"
            >
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? <p>Chargement de l’analyse IA...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {!loading && !error && aiData ? (
          <div className="facture-live-summary">
            <div className="facture-live-item">
              <span>Niveau IA</span>
              <strong>{iaLabel}</strong>
            </div>

            <div className="facture-live-item">
              <span>Période</span>
              <strong>
                {formatDate(aiData.period_start)} → {formatDate(aiData.period_end)}
              </strong>
            </div>

            <div className="facture-live-item">
              <span>Entreprise</span>
              <strong>{aiData.entreprise?.nom || '-'}</strong>
            </div>

            <div className="facture-live-item">
              <span>Plan</span>
              <strong>{aiData.entreprise?.plan_abonnement || '-'}</strong>
            </div>
          </div>
        ) : null}
      </section>

      {!loading && !error && aiData ? (
        <>
          <section className="kpi-grid">
            <article className="kpi-card">
              <div className="kpi-label">Chiffre d’affaires</div>
              <div className="kpi-value">{formatGNF(aiData.resume.chiffre_affaires)}</div>
              <div className="kpi-meta">Total généré par les produits vendus</div>
            </article>

            <article className="kpi-card">
              <div className="kpi-label">Coût total</div>
              <div className="kpi-value">{formatGNF(aiData.resume.cout_total)}</div>
              <div className="kpi-meta">Coût d’achat des produits vendus</div>
            </article>

            <article className="kpi-card">
              <div className="kpi-label">Bénéfice produits</div>
              <div className="kpi-value">{formatGNF(aiData.resume.benefice_produits)}</div>
              <div className="kpi-meta">Bénéfice issu des ventes de produits</div>
            </article>

            <article className="kpi-card kpi-card-highlight">
              <div className="kpi-label">Bénéfice net</div>
              <div className="kpi-value">{formatGNF(aiData.resume.benefice_net)}</div>
              <div className="kpi-meta">Après dépenses et remboursements</div>
            </article>

            <article className="kpi-card">
              <div className="kpi-label">Crédits en cours</div>
              <div className="kpi-value">{formatGNF(aiData.resume.credits_en_cours)}</div>
              <div className="kpi-meta">Montant encore à récupérer</div>
            </article>

            <article className="kpi-card">
              <div className="kpi-label">Alertes stock</div>
              <div className="kpi-value">{aiData.resume.nombre_alertes_stock}</div>
              <div className="kpi-meta">Produits proches de la rupture</div>
            </article>
          </section>

          <section className="page-card">
            <div className="section-head">
              <div>
                <h2>Analyse d’un produit</h2>
                <p>
                  Recherchez un produit pour connaître son chiffre d’affaires,
                  son coût total, son bénéfice et ses quantités vendues.
                </p>
              </div>
            </div>

            <form className="sales-form-grid" onSubmit={handleAnalyseProduit}>
              <div className="form-group">
                <label>Nom du produit</label>
                <input
                  type="text"
                  placeholder="Ex: moto"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  required
                />
              </div>

              <div className="form-actions">
                <button className="primary-btn" type="submit">
                  Analyser le produit
                </button>
              </div>
            </form>

            {productError ? <p className="error-text">{productError}</p> : null}

            {productAnalysis ? (
              <div className="facture-live-summary" style={{ marginTop: '1rem' }}>
                <div className="facture-live-item">
                  <span>Produit</span>
                  <strong>{productAnalysis.nom}</strong>
                </div>

                <div className="facture-live-item">
                  <span>Référence</span>
                  <strong>{productAnalysis.reference}</strong>
                </div>

                <div className="facture-live-item">
                  <span>Quantité vendue</span>
                  <strong>{productAnalysis.quantite_vendue}</strong>
                </div>

                <div className="facture-live-item">
                  <span>Chiffre d’affaires</span>
                  <strong>{formatGNF(productAnalysis.chiffre_affaires)}</strong>
                </div>

                <div className="facture-live-item">
                  <span>Coût total</span>
                  <strong>{formatGNF(productAnalysis.cout_total)}</strong>
                </div>

                <div className="facture-live-item">
                  <span>Bénéfice total</span>
                  <strong>{formatGNF(productAnalysis.benefice_total)}</strong>
                </div>
              </div>
            ) : null}
          </section>

          <section className="content-grid">
            <article className="data-card">
              <div className="data-card-head">
                <div>
                  <h3>Conseils IA standards</h3>
                  <p>Recommandations commerciales immédiates.</p>
                </div>
              </div>

              {aiData.insights.standard.length === 0 ? (
                <p>Aucun conseil disponible pour le moment.</p>
              ) : (
                <div className="report-summary-list">
                  {aiData.insights.standard.map((item, index) => (
                    <div key={index} className="report-summary-item">
                      <span>Conseil {index + 1}</span>
                      <strong>{item}</strong>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="data-card">
              <div className="data-card-head">
                <div>
                  <h3>Conseils IA premium</h3>
                  <p>Analyses plus poussées pour les plans avancés.</p>
                </div>
              </div>

              {aiData.insights.premium.length === 0 ? (
                <p>Aucun conseil premium disponible pour ce plan ou cette période.</p>
              ) : (
                <div className="report-summary-list">
                  {aiData.insights.premium.map((item, index) => (
                    <div key={index} className="report-summary-item">
                      <span>Analyse premium {index + 1}</span>
                      <strong>{item}</strong>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>

          <section className="page-card">
            <div className="section-head">
              <div>
                <h2>Top produits</h2>
                <p>Produits classés par rentabilité et performance commerciale.</p>
              </div>
            </div>

            {aiData.top_produits.length === 0 ? (
              <p>Aucun produit vendu sur cette période.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th>Référence</th>
                      <th>Qté vendue</th>
                      <th>Chiffre d’affaires</th>
                      <th>Coût total</th>
                      <th>Bénéfice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiData.top_produits.map((item) => (
                      <tr key={item.produit_id}>
                        <td>{item.nom}</td>
                        <td>{item.reference}</td>
                        <td>{item.quantite_vendue}</td>
                        <td>{formatGNF(item.chiffre_affaires)}</td>
                        <td>{formatGNF(item.cout_total)}</td>
                        <td>{formatGNF(item.benefice_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="content-grid">
            <article className="data-card">
              <div className="data-card-head">
                <div>
                  <h3>Alertes stock faible</h3>
                  <p>Produits à réapprovisionner rapidement.</p>
                </div>
              </div>

              {aiData.alertes_stock.length === 0 ? (
                <p>Aucune alerte stock.</p>
              ) : (
                <div className="report-summary-list">
                  {aiData.alertes_stock.map((item) => (
                    <div key={item.produit_id} className="report-summary-item">
                      <span>{item.nom} ({item.reference})</span>
                      <strong>Stock restant : {item.stock}</strong>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="data-card">
              <div className="data-card-head">
                <div>
                  <h3>Crédits à relancer</h3>
                  <p>Clients dont le solde reste à récupérer.</p>
                </div>
              </div>

              {aiData.alertes_credits.length === 0 ? (
                <p>Aucun crédit à relancer.</p>
              ) : (
                <div className="report-summary-list">
                  {aiData.alertes_credits.slice(0, 10).map((item) => (
                    <div key={item.id} className="report-summary-item">
                      <span>{item.client_nom}</span>
                      <strong>{formatGNF(item.reste_a_payer)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>
        </>
      ) : null}
    </>
  );
}