import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCommandePublique } from '../services/boutiqueService';
import {
  IconBox, IconSearch, IconInbox, IconCheckCircle, IconTruck,
  IconClock, IconXCircle, IconCheck,
} from '../components/BoutiqueIcons';

function formatGNF(value) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0)) + ' GNF';
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ── Étapes du suivi ── */
const ETAPES = [
  { statut: 'en_attente', label: 'Commande reçue',   icon: <IconInbox size={16} />,       desc: 'Votre commande a bien été reçue.' },
  { statut: 'confirmee',  label: 'Confirmée',         icon: <IconCheckCircle size={16} />, desc: 'Le vendeur a confirmé votre commande.' },
  { statut: 'livree',     label: 'Livrée',            icon: <IconTruck size={16} />,       desc: 'Votre commande a été livrée.' },
];

const STATUT_INDEX = { en_attente: 0, confirmee: 1, livree: 2, annulee: -1 };

export default function SuiviCommandePage() {
  const { numero } = useParams();
  const navigate   = useNavigate();

  const [commande, setCommande]     = useState(null);
  const [loading, setLoading]       = useState(false);
  const [erreur, setErreur]         = useState(null);
  const [recherche, setRecherche]   = useState(numero || '');
  const [rechercheFaite, setRechercheFaite] = useState(false);

  /* Charger au montage si numéro dans l'URL */
  useState(() => {
    if (numero) charger(numero);
  });

  async function charger(num) {
    const n = (num || recherche).trim().toUpperCase();
    if (!n) return;
    try {
      setLoading(true);
      setErreur(null);
      setCommande(null);
      setRechercheFaite(true);
      const data = await getCommandePublique(n);
      if (!data) {
        setErreur(`Aucune commande trouvée avec le numéro « ${n} ».`);
      } else {
        setCommande(data);
        /* Mettre à jour l'URL sans recharger */
        navigate(`/suivi/${n}`, { replace: true });
      }
    } catch {
      setErreur('Erreur lors de la recherche. Vérifiez le numéro et réessayez.');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    charger(recherche);
  }

  const etapeActuelle = commande ? STATUT_INDEX[commande.statut] : -1;
  const estAnnulee    = commande?.statut === 'annulee';
  const couleur       = commande?.boutiques?.couleur_principale || '#3b82f6';

  return (
    <div className="suivi-page">

      {/* ── En-tête ── */}
      <header className="suivi-header">
        <div className="suivi-header-inner">
          <div className="suivi-header-brand">
            <div className="suivi-brand-icon"><IconBox size={40} style={{ opacity: 0.8 }} /></div>
            <div>
              <h1 className="suivi-brand-title">Suivi de commande</h1>
              <p className="suivi-brand-sub">Entrez votre numéro de commande pour suivre sa progression</p>
            </div>
          </div>
        </div>
      </header>

      <div className="suivi-container">

        {/* ── Formulaire recherche ── */}
        <section className="suivi-search-card">
          <form onSubmit={handleSubmit} className="suivi-search-form">
            <div className="suivi-search-wrap">
              <span className="suivi-search-icon"><IconSearch size={16} /></span>
              <input
                type="text"
                className="suivi-search-input"
                placeholder="Ex : CMD-2024-0042"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value.toUpperCase())}
                autoFocus={!numero}
                spellCheck={false}
              />
            </div>
            <button
              type="submit"
              className="suivi-search-btn"
              style={{ background: '#0f172a' }}
              disabled={loading || !recherche.trim()}
            >
              {loading ? 'Recherche…' : 'Rechercher'}
            </button>
          </form>
          <p className="suivi-search-hint">
            Votre numéro de commande vous a été communiqué lors de votre achat (ex : CMD-2024-0042).
          </p>
        </section>

        {/* ── Erreur ── */}
        {erreur && !loading && (
          <div className="suivi-error-card">
            <span className="suivi-error-icon"><IconXCircle size={24} /></span>
            <div>
              <p className="suivi-error-title">Commande introuvable</p>
              <p className="suivi-error-msg">{erreur}</p>
            </div>
          </div>
        )}

        {/* ── Résultat commande ── */}
        {commande && !loading && (
          <div className="suivi-result">

            {/* En-tête commande */}
            <section className="suivi-card suivi-card--head"
              style={{ borderTop: `4px solid ${estAnnulee ? '#dc2626' : couleur}` }}>
              <div className="suivi-commande-meta">
                <div>
                  <span className="suivi-numero-label">Numéro de commande</span>
                  <h2 className="suivi-numero">{commande.numero_commande}</h2>
                </div>
                <span className={`suivi-statut-badge suivi-statut-${commande.statut}`}>
                  {commande.statut === 'en_attente' && <><IconClock size={13} /> En attente</>}
                  {commande.statut === 'confirmee'  && <><IconCheckCircle size={13} /> Confirmée</>}
                  {commande.statut === 'livree'     && <><IconTruck size={13} /> Livrée</>}
                  {commande.statut === 'annulee'    && <><IconXCircle size={13} /> Annulée</>}
                </span>
              </div>

              <div className="suivi-infos-grid">
                <div className="suivi-info-item">
                  <span>Client</span>
                  <strong>{commande.client_nom}</strong>
                </div>
                <div className="suivi-info-item">
                  <span>Téléphone</span>
                  <strong>{commande.client_telephone}</strong>
                </div>
                <div className="suivi-info-item">
                  <span>Date de commande</span>
                  <strong>{formatDate(commande.created_at)}</strong>
                </div>
                {commande.boutiques?.nom_boutique && (
                  <div className="suivi-info-item">
                    <span>Boutique</span>
                    <strong>{commande.boutiques.nom_boutique}</strong>
                  </div>
                )}
                {commande.client_adresse && (
                  <div className="suivi-info-item suivi-info-item--full">
                    <span>Adresse de livraison</span>
                    <strong>{commande.client_adresse}</strong>
                  </div>
                )}
              </div>
            </section>

            {/* Timeline suivi */}
            {!estAnnulee ? (
              <section className="suivi-card">
                <h3 className="suivi-section-title">Progression</h3>
                <div className="suivi-timeline">
                  {ETAPES.map((etape, i) => {
                    const fait     = i <= etapeActuelle;
                    const actuelle = i === etapeActuelle;
                    return (
                      <div
                        key={etape.statut}
                        className={`suivi-etape${fait ? ' fait' : ''}${actuelle ? ' actuelle' : ''}`}
                      >
                        {/* Connecteur */}
                        {i > 0 && (
                          <div className={`suivi-connecteur${i <= etapeActuelle ? ' fait' : ''}`}
                            style={fait ? { background: couleur } : {}} />
                        )}
                        {/* Cercle */}
                        <div
                          className={`suivi-etape-cercle${fait ? ' fait' : ''}`}
                          style={fait ? { background: couleur, borderColor: couleur } : {}}
                        >
                          {fait ? (
                            <span className="suivi-etape-check"><IconCheck size={14} /></span>
                          ) : (
                            <span className="suivi-etape-num">{i + 1}</span>
                          )}
                        </div>
                        {/* Texte */}
                        <div className="suivi-etape-texte">
                          <span
                            className="suivi-etape-label"
                            style={actuelle ? { color: couleur } : {}}
                          >
                            {etape.icon} {etape.label}
                          </span>
                          {actuelle && (
                            <span className="suivi-etape-desc">{etape.desc}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : (
              <section className="suivi-card suivi-card--annulee">
                <div className="suivi-annulee-content">
                  <span className="suivi-annulee-icon"><IconXCircle size={40} /></span>
                  <div>
                    <h3>Commande annulée</h3>
                    <p>Cette commande a été annulée. Contactez le vendeur pour plus d'informations.</p>
                  </div>
                </div>
              </section>
            )}

            {/* Articles commandés */}
            <section className="suivi-card">
              <h3 className="suivi-section-title">Articles commandés</h3>
              <div className="suivi-lignes">
                {(commande.lignes || []).map((l, i) => (
                  <div key={i} className="suivi-ligne">
                    <div className="suivi-ligne-info">
                      <span className="suivi-ligne-nom">{l.nom}</span>
                      <span className="suivi-ligne-ref">Réf : {l.reference}</span>
                    </div>
                    <div className="suivi-ligne-calcul">
                      <span>{l.quantite} × {formatGNF(l.prix_unitaire)}</span>
                      <strong>{formatGNF(l.sous_total)}</strong>
                    </div>
                  </div>
                ))}

                {Number(commande.frais_livraison) > 0 && !commande.livraison_incluse && (
                  <div className="suivi-ligne suivi-ligne--livraison">
                    <span>Frais de livraison</span>
                    <strong>{formatGNF(commande.frais_livraison)}</strong>
                  </div>
                )}

                <div className="suivi-ligne suivi-ligne--total"
                  style={{ borderTop: `2px solid ${couleur}22` }}>
                  <span>Total</span>
                  <strong style={{ color: couleur }}>{formatGNF(commande.total)}</strong>
                </div>
              </div>
            </section>

            {/* Contact boutique */}
            {commande.boutiques && (
              <section className="suivi-card suivi-card--contact">
                <p className="suivi-contact-text">
                  Une question sur votre commande ? Contactez{' '}
                  <strong>{commande.boutiques.nom_boutique}</strong> directement.
                </p>
                {commande.boutiques.slug && (
                  <a
                    href={`/boutique/${commande.boutiques.slug}`}
                    className="suivi-boutique-link"
                    style={{ color: couleur }}
                  >
                    Retourner à la boutique →
                  </a>
                )}
              </section>
            )}
          </div>
        )}

        {/* Loader */}
        {loading && (
          <div className="suivi-loader">
            <div className="boutique-spinner" />
            <span>Recherche en cours…</span>
          </div>
        )}

        {/* État initial (pas encore recherché) */}
        {!rechercheFaite && !loading && (
          <div className="suivi-empty">
            <div className="suivi-empty-icon"><IconBox size={48} style={{ opacity: 0.35 }} /></div>
            <p>Saisissez votre numéro de commande ci-dessus pour suivre sa progression.</p>
          </div>
        )}
      </div>
    </div>
  );
}
