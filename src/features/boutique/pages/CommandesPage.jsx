import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCommandes, updateStatutCommande, deleteCommande } from '../services/boutiqueService';
import { usePagination } from '../../../hooks/usePagination';
import Pagination from '../../../components/Pagination';
import { IconSearch, IconClipboard, IconRefresh, IconDownload } from '../components/BoutiqueIcons';

/* ── Formatters ── */
function formatGNF(value) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0)) + ' GNF';
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDateCourt(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

/* ── Constantes ── */
const STATUT_LABELS = {
  en_attente: 'En attente',
  confirmee:  'Confirmée',
  livree:     'Livrée',
  annulee:    'Annulée',
};

const STATUT_SUIVANT = {
  en_attente: 'confirmee',
  confirmee:  'livree',
};

const POLL_INTERVAL = 30_000; // 30 secondes

/* ── Export CSV ── */
function exportCSV(commandes) {
  const headers = ['Date', 'Client', 'Téléphone', 'Adresse', 'Articles', 'Total (GNF)', 'Statut', 'Notes'];
  const rows = commandes.map((c) => [
    formatDate(c.created_at),
    c.client_nom || '',
    c.client_telephone || '',
    c.client_adresse || '',
    (c.lignes || []).length,
    Number(c.total || 0),
    STATUT_LABELS[c.statut] || c.statut,
    (c.notes || '').replace(/\n/g, ' '),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `commandes-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ════════════════════════════════════════
   COMPOSANT PRINCIPAL
════════════════════════════════════════ */
export default function CommandesPage() {
  /* ── State data ── */
  const [commandes, setCommandes]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [erreur, setErreur]               = useState(null);

  /* ── Filtres ── */
  const [filtreStatut, setFiltreStatut]   = useState('');
  const [recherche, setRecherche]         = useState('');
  const [dateDebut, setDateDebut]         = useState('');
  const [dateFin, setDateFin]             = useState('');

  /* ── Nouvelles commandes (polling) ── */
  const [nouvellesIds, setNouvellesIds]   = useState(new Set());
  const [nbNouvelles, setNbNouvelles]     = useState(0);
  const connuesRef                        = useRef(new Set());
  const premiereCharge                    = useRef(true);

  /* ── UI ── */
  const [commandeDetail, setCommandeDetail] = useState(null);
  const [actionLoading, setActionLoading]   = useState(null);

  /* ── Pagination ── */
  const [commandesFiltrees, setCommandesFiltrees] = useState([]);
  const { page, totalPages, totalItems, pageSize, paginatedItems, goToPage, nextPage, prevPage } =
    usePagination(commandesFiltrees, 10);

  /* ──────────────────────────────────────
     CHARGEMENT + POLLING
  ────────────────────────────────────── */
  const loadCommandes = useCallback(async (silencieux = false) => {
    try {
      if (!silencieux) setLoading(true);
      setErreur(null);
      const data = await getCommandes(filtreStatut || null);

      /* Détection nouvelles commandes (hors première charge) */
      if (!premiereCharge.current) {
        const nouvelles = data.filter(
          (c) => c.statut === 'en_attente' && !connuesRef.current.has(c.id)
        );
        if (nouvelles.length > 0) {
          setNouvellesIds((prev) => {
            const next = new Set(prev);
            nouvelles.forEach((c) => next.add(c.id));
            return next;
          });
          setNbNouvelles((n) => n + nouvelles.length);
          /* Son de notification (discret) */
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.4);
          } catch { /* AudioContext non dispo — pas grave */ }
        }
      }

      /* Mémoriser les IDs connus */
      data.forEach((c) => connuesRef.current.add(c.id));
      premiereCharge.current = false;

      setCommandes(data);
      if (!silencieux) goToPage(1);
    } catch {
      setErreur('Erreur lors du chargement des commandes.');
    } finally {
      setLoading(false);
    }
  }, [filtreStatut]); // eslint-disable-line

  /* Chargement initial + rechargement quand le filtre statut change */
  useEffect(() => {
    premiereCharge.current = true;
    loadCommandes(false);
  }, [filtreStatut]); // eslint-disable-line

  /* Polling toutes les 30s */
  useEffect(() => {
    const timer = setInterval(() => loadCommandes(true), POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [loadCommandes]);

  /* ──────────────────────────────────────
     FILTRAGE LOCAL (recherche + dates)
  ────────────────────────────────────── */
  useEffect(() => {
    let result = [...commandes];

    /* Recherche client */
    if (recherche.trim()) {
      const q = recherche.toLowerCase();
      result = result.filter(
        (c) =>
          (c.client_nom || '').toLowerCase().includes(q) ||
          (c.client_telephone || '').includes(q)
      );
    }

    /* Filtre date début */
    if (dateDebut) {
      result = result.filter((c) => c.created_at >= new Date(dateDebut).toISOString());
    }

    /* Filtre date fin */
    if (dateFin) {
      const fin = new Date(dateFin);
      fin.setHours(23, 59, 59, 999);
      result = result.filter((c) => c.created_at <= fin.toISOString());
    }

    setCommandesFiltrees(result);
    goToPage(1);
  }, [commandes, recherche, dateDebut, dateFin]); // eslint-disable-line

  /* ──────────────────────────────────────
     STATS (calculées sur TOUTES les commandes, pas filtrées)
  ────────────────────────────────────── */
  const stats = useMemo(() => ({
    total:     commandes.length,
    en_attente: commandes.filter((c) => c.statut === 'en_attente').length,
    confirmee:  commandes.filter((c) => c.statut === 'confirmee').length,
    livree:     commandes.filter((c) => c.statut === 'livree').length,
    ca:         commandes
      .filter((c) => c.statut !== 'annulee')
      .reduce((s, c) => s + Number(c.total || 0), 0),
  }), [commandes]);

  /* ──────────────────────────────────────
     ACTIONS
  ────────────────────────────────────── */
  async function handleUpdateStatut(commandeId, statut) {
    try {
      setActionLoading(commandeId + statut);
      await updateStatutCommande(commandeId, statut);
      /* Retirer du badge nouvelles */
      setNouvellesIds((prev) => { const n = new Set(prev); n.delete(commandeId); return n; });
      await loadCommandes(true);
      if (commandeDetail?.id === commandeId) setCommandeDetail(null);
    } catch (e) {
      alert('Erreur : ' + e.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(commandeId) {
    if (!confirm('Supprimer cette commande définitivement ?')) return;
    try {
      setActionLoading(commandeId + 'delete');
      await deleteCommande(commandeId);
      connuesRef.current.delete(commandeId);
      await loadCommandes(true);
    } catch (e) {
      alert('Erreur : ' + e.message);
    } finally {
      setActionLoading(null);
    }
  }

  function effacerBadge() {
    setNouvellesIds(new Set());
    setNbNouvelles(0);
  }

  function reinitialiserFiltres() {
    setRecherche('');
    setDateDebut('');
    setDateFin('');
    setFiltreStatut('');
  }

  const aDesFiltres = recherche || dateDebut || dateFin || filtreStatut;

  /* ════════════════════════════════════════
     RENDU
  ════════════════════════════════════════ */
  return (
    <>
      {/* ── KPIs ── */}
      <section className="page-card">
        <div className="section-head">
          <div>
            <h2>
              Commandes en ligne
              {nbNouvelles > 0 && (
                <span
                  className="commandes-new-badge"
                  onClick={effacerBadge}
                  title="Cliquer pour effacer"
                >
                  +{nbNouvelles} nouvelle{nbNouvelles > 1 ? 's' : ''}
                </span>
              )}
            </h2>
            <p>Gérez les commandes reçues depuis votre boutique. Actualisé toutes les 30 s.</p>
          </div>
          <button
            className="secondary-outline-btn commandes-refresh-btn"
            type="button"
            onClick={() => loadCommandes(false)}
            disabled={loading}
          >
            {loading ? '...' : <><IconRefresh size={14} /> Actualiser</>}
          </button>
        </div>

        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">Total</div>
            <div className="kpi-value">{stats.total}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">En attente</div>
            <div className="kpi-value kpi-value--warning">
              {stats.en_attente}
              {stats.en_attente > 0 && <span className="kpi-pulse" />}
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Confirmées</div>
            <div className="kpi-value kpi-value--accent">{stats.confirmee}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Livrées</div>
            <div className="kpi-value kpi-value--success">{stats.livree}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">CA total</div>
            <div className="kpi-value kpi-value--lg">{formatGNF(stats.ca)}</div>
          </div>
        </div>
      </section>

      {/* ── Liste ── */}
      <section className="page-card">
        <div className="section-head">
          <div>
            <h2>Liste des commandes</h2>
            <p>Confirmez, livrez ou annulez les commandes de vos clients.</p>
          </div>
          {/* Export CSV */}
          <button
            className="commandes-export-btn"
            type="button"
            onClick={() => exportCSV(commandesFiltrees)}
            disabled={commandesFiltrees.length === 0}
          >
            <IconDownload size={14} /> Export CSV
          </button>
        </div>

        {/* ── Barre de filtres ── */}
        <div className="commandes-filters">
          {/* Recherche */}
          <div className="commandes-search-wrap">
            <span className="commandes-search-icon"><IconSearch size={15} /></span>
            <input
              type="text"
              className="commandes-search-input"
              placeholder="Rechercher un client, téléphone…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
          </div>

          {/* Filtre statut */}
          <select
            className="list-filter-select"
            value={filtreStatut}
            onChange={(e) => setFiltreStatut(e.target.value)}
          >
            <option value="">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="confirmee">Confirmées</option>
            <option value="livree">Livrées</option>
            <option value="annulee">Annulées</option>
          </select>

          {/* Dates */}
          <div className="commandes-date-range">
            <div className="commandes-date-field">
              <label>Du</label>
              <input
                type="date"
                className="commandes-date-input"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
              />
            </div>
            <div className="commandes-date-field">
              <label>Au</label>
              <input
                type="date"
                className="commandes-date-input"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
              />
            </div>
          </div>

          {/* Reset filtres */}
          {aDesFiltres && (
            <button
              type="button"
              className="commandes-reset-btn"
              onClick={reinitialiserFiltres}
            >
              ✕ Effacer
            </button>
          )}
        </div>

        {/* Compteur résultats */}
        <div className="commandes-results-bar">
          <span className="list-count-badge">
            {commandesFiltrees.length} commande{commandesFiltrees.length !== 1 ? 's' : ''}
            {aDesFiltres && ` filtrée${commandesFiltrees.length !== 1 ? 's' : ''}`}
          </span>
          {dateDebut && dateFin && (
            <span className="commandes-date-range-label">
              {formatDateCourt(dateDebut)} → {formatDateCourt(dateFin)}
            </span>
          )}
        </div>

        {erreur && <p className="error-text">{erreur}</p>}

        {loading ? (
          <p>Chargement des commandes…</p>
        ) : commandesFiltrees.length === 0 ? (
          <div className="commandes-empty">
            <div className="commandes-empty-icon"><IconClipboard size={40} style={{ opacity: 0.4 }} /></div>
            <p>
              {aDesFiltres
                ? 'Aucune commande ne correspond à ces filtres.'
                : 'Aucune commande pour le moment.'}
            </p>
            {aDesFiltres && (
              <button type="button" className="secondary-outline-btn" onClick={reinitialiserFiltres}>
                Effacer les filtres
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── Table desktop ── */}
            <div className="table-wrap commandes-table-desktop">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Client</th>
                    <th>Téléphone</th>
                    <th>Articles</th>
                    <th>Total</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((cmd) => {
                    const suivant  = STATUT_SUIVANT[cmd.statut];
                    const isLoad   = actionLoading?.startsWith(cmd.id);
                    const estNouvelle = nouvellesIds.has(cmd.id);
                    return (
                      <tr key={cmd.id} className={estNouvelle ? 'commande-row-nouvelle' : ''}>
                        <td>{formatDate(cmd.created_at)}</td>
                        <td>
                          <strong>{cmd.client_nom}</strong>
                          {estNouvelle && <span className="commande-inline-badge">Nouveau</span>}
                        </td>
                        <td>{cmd.client_telephone}</td>
                        <td>{(cmd.lignes || []).length} article{(cmd.lignes || []).length > 1 ? 's' : ''}</td>
                        <td><strong>{formatGNF(cmd.total)}</strong></td>
                        <td>
                          <span className={`sale-status-badge ${cmd.statut}`}>
                            {STATUT_LABELS[cmd.statut] || cmd.statut}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button className="table-action-btn edit" onClick={() => setCommandeDetail(cmd)}>
                              Détail
                            </button>
                            {suivant && (
                              <button
                                className="table-action-btn edit"
                                onClick={() => handleUpdateStatut(cmd.id, suivant)}
                                disabled={isLoad}
                              >
                                {isLoad ? '…' : suivant === 'confirmee' ? 'Confirmer' : 'Livrer'}
                              </button>
                            )}
                            {cmd.statut === 'en_attente' && (
                              <button
                                className="table-action-btn delete"
                                onClick={() => handleUpdateStatut(cmd.id, 'annulee')}
                                disabled={isLoad}
                              >
                                Annuler
                              </button>
                            )}
                            {cmd.statut === 'annulee' && (
                              <button
                                className="table-action-btn delete"
                                onClick={() => handleDelete(cmd.id)}
                                disabled={isLoad}
                              >
                                Supprimer
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Cartes mobiles ── */}
            <div className="commandes-mobile-list">
              {paginatedItems.map((cmd) => {
                const suivant     = STATUT_SUIVANT[cmd.statut];
                const isLoad      = actionLoading?.startsWith(cmd.id);
                const estNouvelle = nouvellesIds.has(cmd.id);
                return (
                  <article
                    key={cmd.id}
                    className={`mobile-sale-card${estNouvelle ? ' mobile-sale-card--nouvelle' : ''}`}
                  >
                    <div className="mobile-sale-head">
                      <div className="mobile-sale-head-text">
                        <h3>
                          {cmd.client_nom}
                          {estNouvelle && <span className="commande-inline-badge">Nouveau</span>}
                        </h3>
                        <p>{cmd.client_telephone} · {formatDate(cmd.created_at)}</p>
                      </div>
                      <span className={`sale-status-badge ${cmd.statut}`}>
                        {STATUT_LABELS[cmd.statut]}
                      </span>
                    </div>

                    <div className="mobile-sale-details">
                      <div className="mobile-sale-item">
                        <span>Articles</span>
                        <strong>{(cmd.lignes || []).length} article{(cmd.lignes || []).length > 1 ? 's' : ''}</strong>
                      </div>
                      <div className="mobile-sale-item">
                        <span>Total</span>
                        <strong>{formatGNF(cmd.total)}</strong>
                      </div>
                      {cmd.client_adresse && (
                        <div className="mobile-sale-item mobile-sale-item-full">
                          <span>Adresse</span>
                          <strong>{cmd.client_adresse}</strong>
                        </div>
                      )}
                    </div>

                    <div className="mobile-sale-actions">
                      <button className="table-action-btn edit" onClick={() => setCommandeDetail(cmd)}>
                        Voir le détail
                      </button>
                      {suivant && (
                        <button
                          className="table-action-btn edit"
                          onClick={() => handleUpdateStatut(cmd.id, suivant)}
                          disabled={isLoad}
                        >
                          {isLoad ? '…' : suivant === 'confirmee' ? 'Confirmer' : 'Livrer'}
                        </button>
                      )}
                      {cmd.statut === 'en_attente' && (
                        <button
                          className="table-action-btn delete"
                          onClick={() => handleUpdateStatut(cmd.id, 'annulee')}
                          disabled={isLoad}
                        >
                          Annuler
                        </button>
                      )}
                      {cmd.statut === 'annulee' && (
                        <button
                          className="table-action-btn delete"
                          onClick={() => handleDelete(cmd.id)}
                          disabled={isLoad}
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPrev={prevPage}
              onNext={nextPage}
              onGoTo={goToPage}
            />
          </>
        )}
      </section>

      {/* ── Modal détail commande ── */}
      {commandeDetail && (
        <div className="confirm-modal-overlay" onClick={() => setCommandeDetail(null)}>
          <div className="confirm-modal commande-modal-detail" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-badge">Détail commande</div>
            <h3>{commandeDetail.client_nom}</h3>

            <div className="commande-detail-grid">
              <div className="commande-detail-item">
                <span>Téléphone</span>
                <strong>{commandeDetail.client_telephone}</strong>
              </div>
              <div className="commande-detail-item">
                <span>Date</span>
                <strong>{formatDate(commandeDetail.created_at)}</strong>
              </div>
              <div className="commande-detail-item">
                <span>Statut</span>
                <strong>
                  <span className={`sale-status-badge ${commandeDetail.statut}`}>
                    {STATUT_LABELS[commandeDetail.statut]}
                  </span>
                </strong>
              </div>
              {commandeDetail.client_adresse && (
                <div className="commande-detail-item">
                  <span>Adresse</span>
                  <strong>{commandeDetail.client_adresse}</strong>
                </div>
              )}
              {commandeDetail.notes && (
                <div className="commande-detail-item commande-detail-item--full">
                  <span>Notes</span>
                  <strong>{commandeDetail.notes}</strong>
                </div>
              )}
            </div>

            <p className="commande-detail-articles-title">Articles commandés</p>
            <div className="commande-lignes-box">
              {(commandeDetail.lignes || []).map((l, i) => (
                <div key={i} className="commande-ligne-row">
                  <span>
                    {l.nom}
                    <span className="commande-ligne-ref"> ({l.reference})</span>
                  </span>
                  <span>
                    {l.quantite} × {formatGNF(l.prix_unitaire)} = <strong>{formatGNF(l.sous_total)}</strong>
                  </span>
                </div>
              ))}
              {commandeDetail.frais_livraison > 0 && (
                <div className="commande-ligne-row">
                  <span>Frais de livraison{commandeDetail.livraison_incluse ? ' (inclus)' : ''}</span>
                  <span>{commandeDetail.livraison_incluse ? '—' : formatGNF(commandeDetail.frais_livraison)}</span>
                </div>
              )}
              <div className="commande-ligne-row total">
                <span>Total</span>
                <strong>{formatGNF(commandeDetail.total)}</strong>
              </div>
            </div>

            {/* Actions depuis la modal */}
            <div className="confirm-modal-actions">
              {STATUT_SUIVANT[commandeDetail.statut] && (
                <button
                  className="primary-btn"
                  onClick={() => handleUpdateStatut(commandeDetail.id, STATUT_SUIVANT[commandeDetail.statut])}
                  disabled={!!actionLoading}
                >
                  {STATUT_SUIVANT[commandeDetail.statut] === 'confirmee' ? 'Confirmer' : 'Marquer livrée'}
                </button>
              )}
              <button className="secondary-outline-btn" onClick={() => setCommandeDetail(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
