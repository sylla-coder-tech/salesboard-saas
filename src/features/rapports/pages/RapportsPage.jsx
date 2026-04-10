import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { getRapportGlobal } from '../services/rapportsService';
import { useAuthContextData } from '../../auth/services/useAuthContext';

function formatGNF(value) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0)) + ' GNF';
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR');
}

function formatStatut(statut) {
  if (statut === 'payee') return 'Payée';
  if (statut === 'en_attente') return 'En attente';
  if (statut === 'livree') return 'Livrée';
  return statut || '-';
}

const periodOptions = [
  { value: 'today', label: "Aujourd'hui" },
  { value: '7days', label: '7 derniers jours' },
  { value: '30days', label: '30 derniers jours' },
  { value: 'year', label: 'Cette année' },
];

export default function RapportsPage() {
  const { entreprise } = useAuthContextData();
  const [period, setPeriod] = useState('30days');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rapport, setRapport] = useState(null);

  async function loadRapport(selectedPeriod) {
    try {
      setLoading(true);
      setError('');
      const data = await getRapportGlobal(selectedPeriod);
      setRapport(data);
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement du rapport');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRapport(period);
  }, [period]);

  function handlePrint() {
    window.print();
  }

  function exportRapportCSV() {
    if (!rapport) return;

    const rows = [
      ['Entreprise', entreprise?.nom || 'Entreprise'],
      ['Période', periodOptions.find((item) => item.value === rapport.period)?.label || '-'],
      ['Début', new Date(rapport.start).toLocaleDateString('fr-FR')],
      ['Fin', new Date(rapport.end).toLocaleDateString('fr-FR')],
      ['', ''],
      ['RÉSUMÉ GÉNÉRAL', ''],
      ['Indicateur', 'Valeur'],
      ['Chiffre d’affaires', rapport.stats.chiffreAffaires],
      ['Ventes encaissées', rapport.stats.ventesEncaissees],
      ['Coût total des ventes', rapport.stats.coutTotalVentes],
      ['Bénéfice net des ventes', rapport.stats.beneficeNetVentes],
      ['Frais de livraison', rapport.stats.totalLivraison],
      ['Total dépenses', rapport.stats.totalDepenses],
      ['Caisse nette', rapport.stats.caisseNette],
      ['Crédits en cours', rapport.stats.creditsEnCours],
      ['Remboursements', rapport.stats.totalRemboursements],
      ['Nombre de ventes', rapport.stats.nombreVentes],
      ['Nombre de dépenses', rapport.stats.nombreDepenses],
      ['Nombre de crédits', rapport.stats.nombreCredits],
      ['', ''],
      ['TOP PRODUITS', '', '', '', '', ''],
      ['Produit', 'Référence', 'Nombre de ventes', 'Chiffre d’affaires', 'Coût total', 'Bénéfice généré'],
      ...rapport.topProduits.map((produit) => [
        produit.nom || '-',
        produit.reference || '-',
        produit.nombre_ventes,
        produit.chiffre_affaires,
        produit.cout_total,
        produit.caisse_generee,
      ]),
      ['', '', '', '', '', ''],
      ['DERNIÈRES VENTES', '', '', '', '', '', '', ''],
      ['Client', 'Produit', 'Total articles', 'Coût total', 'Livraison', 'Total facturé', 'Bénéfice net', 'Date'],
      ...rapport.ventes.map((vente) => [
        [vente.nomClient, vente.prenomClient].filter(Boolean).join(' ') || '-',
        (vente.lignes || []).map((ligne) => ligne.nomProduit).filter(Boolean).join(', ') || '-',
        vente.total_articles || 0,
        vente.cout_total_vente || 0,
        vente.fraisLivraison || 0,
        vente.total_vente || 0,
        vente.benefice || 0,
        vente.dateAchat ? new Date(vente.dateAchat).toLocaleDateString('fr-FR') : '-',
      ]),
    ];

    const csvContent = rows
      .map((row) =>
        row
          .map((cell) => {
            const value = cell ?? '';
            const text = String(value).replace(/"/g, '""');
            return `"${text}"`;
          })
          .join(';')
      )
      .join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `rapport-${rapport.period}-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section className="page-card no-print">
        <div className="section-head reports-head-mobile">
          <div>
            <h2>Rapports</h2>
            <p>Analyse synthétique des performances de votre entreprise par période.</p>
          </div>

          <div className="report-actions-wrap">
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

            <button
              className="secondary-outline-btn report-export-btn"
              type="button"
              onClick={exportRapportCSV}
            >
              Export CSV
            </button>

            <button
              className="primary-btn report-print-btn"
              type="button"
              onClick={handlePrint}
            >
              Imprimer le rapport
            </button>
          </div>
        </div>

        {loading ? <p>Chargement du rapport...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
      </section>

      {!loading && !error && rapport ? (
        <>
          <section className="page-card report-print-header print-only">
            <h1>{entreprise?.nom || 'Entreprise'}</h1>
            <p>
              Rapport :{' '}
              {periodOptions.find((item) => item.value === rapport.period)?.label || '-'}
            </p>
            <p>
              Période du {new Date(rapport.start).toLocaleDateString('fr-FR')} au{' '}
              {new Date(rapport.end).toLocaleDateString('fr-FR')}
            </p>
          </section>

          <section className="kpi-grid">
            <article className="kpi-card">
              <div className="kpi-label">Chiffre d’affaires</div>
              <div className="kpi-value">{formatGNF(rapport.stats.chiffreAffaires)}</div>
              <div className="kpi-meta">Total des articles vendus sur la période</div>
            </article>

            <article className="kpi-card">
              <div className="kpi-label">Ventes encaissées</div>
              <div className="kpi-value">{formatGNF(rapport.stats.ventesEncaissees)}</div>
              <div className="kpi-meta">Montants facturés réellement encaissés</div>
            </article>

            <article className="kpi-card">
              <div className="kpi-label">Coût total des ventes</div>
              <div className="kpi-value">{formatGNF(rapport.stats.coutTotalVentes)}</div>
              <div className="kpi-meta">Coût d’achat global des produits vendus</div>
            </article>

            <article className="kpi-card">
              <div className="kpi-label">Bénéfice net des ventes</div>
              <div className="kpi-value">{formatGNF(rapport.stats.beneficeNetVentes)}</div>
              <div className="kpi-meta">Après coût d’achat et livraison</div>
            </article>

            <article className="kpi-card">
              <div className="kpi-label">Total dépenses</div>
              <div className="kpi-value">{formatGNF(rapport.stats.totalDepenses)}</div>
              <div className="kpi-meta">Dépenses enregistrées sur la période</div>
            </article>

            <article className="kpi-card">
              <div className="kpi-label">Caisse nette</div>
              <div className="kpi-value">{formatGNF(rapport.stats.caisseNette)}</div>
              <div className="kpi-meta">Bénéfice net + remboursements - dépenses</div>
            </article>

            <article className="kpi-card">
              <div className="kpi-label">Crédits en cours</div>
              <div className="kpi-value">{formatGNF(rapport.stats.creditsEnCours)}</div>
              <div className="kpi-meta">Montant restant à récupérer</div>
            </article>

            <article className="kpi-card">
              <div className="kpi-label">Remboursements</div>
              <div className="kpi-value">{formatGNF(rapport.stats.totalRemboursements)}</div>
              <div className="kpi-meta">Montants récupérés sur la période</div>
            </article>

            <article className="kpi-card">
              <div className="kpi-label">Nombre de ventes</div>
              <div className="kpi-value">{rapport.stats.nombreVentes}</div>
              <div className="kpi-meta">Total des ventes enregistrées</div>
            </article>
          </section>

          <section className="page-card no-print">
            <div className="section-head">
              <div>
                <h2>Graphiques</h2>
                <p>Visualisation de l’évolution des ventes, dépenses et remboursements.</p>
              </div>
            </div>

            {rapport.series.length === 0 ? (
              <p>Aucune donnée graphique disponible sur cette période.</p>
            ) : (
              <div className="charts-grid">
                <article className="chart-card">
                  <h3>Ventes par jour</h3>
                  <div className="chart-box">
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={rapport.series}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="jour" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatGNF(value)} />
                        <Legend />
                        <Line type="monotone" dataKey="ventes" name="Ventes" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </article>

                <article className="chart-card">
                  <h3>Dépenses par jour</h3>
                  <div className="chart-box">
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={rapport.series}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="jour" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatGNF(value)} />
                        <Legend />
                        <Line type="monotone" dataKey="depenses" name="Dépenses" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </article>

                <article className="chart-card">
                  <h3>Remboursements par jour</h3>
                  <div className="chart-box">
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={rapport.series}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="jour" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatGNF(value)} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="remboursements"
                          name="Remboursements"
                          strokeWidth={3}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </article>
              </div>
            )}
          </section>

          <section className="content-grid">
            <article className="data-card">
              <div className="data-card-head">
                <div>
                  <h3>Résumé opérationnel</h3>
                  <p>Vue d’ensemble des activités sur la période sélectionnée.</p>
                </div>
              </div>

              <div className="report-summary-list">
                <div className="report-summary-item">
                  <span>Nombre de dépenses</span>
                  <strong>{rapport.stats.nombreDepenses}</strong>
                </div>

                <div className="report-summary-item">
                  <span>Nombre de crédits</span>
                  <strong>{rapport.stats.nombreCredits}</strong>
                </div>

                <div className="report-summary-item">
                  <span>Frais de livraison</span>
                  <strong>{formatGNF(rapport.stats.totalLivraison)}</strong>
                </div>
              </div>
            </article>

            <article className="data-card">
              <div className="data-card-head">
                <div>
                  <h3>Période analysée</h3>
                  <p>Cadre temporel utilisé pour le calcul du rapport.</p>
                </div>
              </div>

              <div className="report-summary-list">
                <div className="report-summary-item">
                  <span>Début</span>
                  <strong>{formatDate(rapport.start)}</strong>
                </div>

                <div className="report-summary-item">
                  <span>Fin</span>
                  <strong>{formatDate(rapport.end)}</strong>
                </div>

                <div className="report-summary-item">
                  <span>Filtre</span>
                  <strong>
                    {periodOptions.find((item) => item.value === rapport.period)?.label || '-'}
                  </strong>
                </div>
              </div>
            </article>
          </section>

          <section className="page-card">
            <div className="section-head">
              <div>
                <h2>Top produits</h2>
                <p>Produits les plus performants sur la période sélectionnée.</p>
              </div>
            </div>

            {rapport.topProduits.length === 0 ? (
              <p>Aucun produit vendu sur cette période.</p>
            ) : (
              <>
                <div className="table-wrap rapports-table-desktop">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Produit</th>
                        <th>Référence</th>
                        <th>Nombre de ventes</th>
                        <th>Chiffre d’affaires</th>
                        <th>Coût total</th>
                        <th>Bénéfice généré</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rapport.topProduits.slice(0, 10).map((produit) => (
                        <tr key={produit.produit_id}>
                          <td>{produit.nom || '-'}</td>
                          <td>{produit.reference || '-'}</td>
                          <td>{produit.nombre_ventes}</td>
                          <td>{formatGNF(produit.chiffre_affaires)}</td>
                          <td>{formatGNF(produit.cout_total)}</td>
                          <td>{formatGNF(produit.caisse_generee)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rapports-mobile-list">
                  {rapport.topProduits.slice(0, 10).map((produit) => (
                    <article key={produit.produit_id} className="mobile-report-card">
                      <div className="mobile-report-head">
                        <div className="mobile-report-head-text">
                          <h3>{produit.nom || 'Produit'}</h3>
                          <p>Réf : {produit.reference || '-'}</p>
                        </div>
                      </div>

                      <div className="mobile-report-grid">
                        <div className="mobile-report-item">
                          <span>Ventes</span>
                          <strong>{produit.nombre_ventes}</strong>
                        </div>

                        <div className="mobile-report-item">
                          <span>Chiffre d’affaires</span>
                          <strong>{formatGNF(produit.chiffre_affaires)}</strong>
                        </div>

                        <div className="mobile-report-item">
                          <span>Coût total</span>
                          <strong>{formatGNF(produit.cout_total)}</strong>
                        </div>

                        <div className="mobile-report-item mobile-report-item-full">
                          <span>Bénéfice généré</span>
                          <strong>{formatGNF(produit.caisse_generee)}</strong>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="page-card">
            <div className="section-head">
              <div>
                <h2>Dernières ventes de la période</h2>
                <p>Vue rapide des ventes prises en compte dans le rapport.</p>
              </div>
            </div>

            {rapport.ventes.length === 0 ? (
              <p>Aucune vente sur cette période.</p>
            ) : (
              <>
                <div className="table-wrap rapports-table-desktop">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Produit(s)</th>
                        <th>Total articles</th>
                        <th>Coût total</th>
                        <th>Livraison</th>
                        <th>Total facturé</th>
                        <th>Bénéfice net</th>
                        <th>Statut</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rapport.ventes.slice(0, 10).map((vente) => (
                        <tr key={vente.id}>
                          <td>
                            {[vente.nomClient, vente.prenomClient].filter(Boolean).join(' ') || '-'}
                          </td>
                          <td>
                            {(vente.lignes || [])
                              .map((ligne) => ligne.nomProduit)
                              .filter(Boolean)
                              .join(', ') || '-'}
                          </td>
                          <td>{formatGNF(vente.total_articles)}</td>
                          <td>{formatGNF(vente.cout_total_vente)}</td>
                          <td>{formatGNF(vente.fraisLivraison)}</td>
                          <td>{formatGNF(vente.total_vente)}</td>
                          <td>{formatGNF(vente.benefice)}</td>
                          <td>{formatStatut(vente.statut)}</td>
                          <td>{formatDate(vente.dateAchat)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rapports-mobile-list">
                  {rapport.ventes.slice(0, 10).map((vente) => (
                    <article key={vente.id} className="mobile-report-card">
                      <div className="mobile-report-head">
                        <div className="mobile-report-head-text">
                          <h3>
                            {(vente.lignes || [])
                              .map((ligne) => ligne.nomProduit)
                              .filter(Boolean)
                              .join(', ') || 'Produit'}
                          </h3>
                          <p>{[vente.nomClient, vente.prenomClient].filter(Boolean).join(' ') || '-'}</p>
                        </div>

                        <div className={`sale-status-badge ${vente.statut || ''}`}>
                          {formatStatut(vente.statut)}
                        </div>
                      </div>

                      <div className="mobile-report-grid">
                        <div className="mobile-report-item">
                          <span>Total articles</span>
                          <strong>{formatGNF(vente.total_articles)}</strong>
                        </div>

                        <div className="mobile-report-item">
                          <span>Coût total</span>
                          <strong>{formatGNF(vente.cout_total_vente)}</strong>
                        </div>

                        <div className="mobile-report-item">
                          <span>Livraison</span>
                          <strong>{formatGNF(vente.fraisLivraison)}</strong>
                        </div>

                        <div className="mobile-report-item">
                          <span>Total facturé</span>
                          <strong>{formatGNF(vente.total_vente)}</strong>
                        </div>

                        <div className="mobile-report-item">
                          <span>Bénéfice net</span>
                          <strong>{formatGNF(vente.benefice)}</strong>
                        </div>

                        <div className="mobile-report-item">
                          <span>Date</span>
                          <strong>{formatDate(vente.dateAchat)}</strong>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        </>
      ) : null}
    </>
  );
}