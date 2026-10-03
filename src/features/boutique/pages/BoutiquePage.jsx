import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  getBoutiquePublique,
  getProduitsBoutiquePublique,
  passerCommande,
} from '../services/boutiqueService';
import {
  IconWhatsApp,
  IconCart,
  IconSearch,
  IconBox,
  IconSuccess,
  IconX,
} from '../components/BoutiqueIcons';
import { useBoutiqueOGMeta } from '../../../hooks/useBoutiqueOGMeta';

function formatGNF(value) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0)) + ' GNF';
}

export default function BoutiquePage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  /* ── Data ── */
  const [boutique, setBoutique] = useState(null);
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);

  /* ── Panier { [produitId]: quantite } ── */
  const [panier, setPanier] = useState({});

  /* ── Recherche ── */
  const [search, setSearch] = useState('');

  /* ── Modal détail produit ── */
  const [detailProduit, setDetailProduit] = useState(null);
  const [detailQte, setDetailQte] = useState(1);

  /* ── Modal commande ── */
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    client_nom: '',
    client_telephone: '',
    client_adresse: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [commandeConfirmee, setCommandeConfirmee] = useState(null);

  /* ── Chargement ── */
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const b = await getBoutiquePublique(slug);
        if (!b) { setErreur('Cette boutique est introuvable ou inactive.'); return; }
        setBoutique(b);
        const p = await getProduitsBoutiquePublique(b.id);
        setProduits(p);
      } catch {
        setErreur('Erreur lors du chargement de la boutique.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  /* ── Produits filtrés par recherche ── */
  const produitsFiltres = useMemo(() => {
    if (!search.trim()) return produits;
    const q = search.toLowerCase();
    return produits.filter(
      (p) =>
        p.nom.toLowerCase().includes(q) ||
        (p.reference || '').toLowerCase().includes(q)
    );
  }, [produits, search]);

  /* ── Toutes les lignes produits (stock = 0 inclus pour affichage rupture) ── */
  const couleur = boutique?.couleur_principale || '#3b82f6';

  /* ── Ouverture automatique si ?produit=REF dans l'URL ──
     Flow lien boosté : produit ajouté au panier + formulaire commande ouvert direct ── */
  useEffect(() => {
    const ref = searchParams.get('produit');
    if (!ref || !produits.length) return;
    const trouve = produits.find(
      (p) => (p.reference || '').toLowerCase() === ref.toLowerCase()
    );
    if (!trouve || Number(trouve.stock) <= 0) return;

    /* 1. Ajouter le produit au panier (qte 1) */
    setPanier({ [trouve.id]: 1 });

    /* 2. Ouvrir directement le formulaire de commande */
    setShowForm(true);
  }, [produits, searchParams]);

  /* ── Meta tags OG/Twitter pour partage réseaux sociaux ── */
  /* Si un produit spécifique est ouvert → OG tags du produit, sinon boutique */
  useBoutiqueOGMeta(boutique, detailProduit);

  /* ── Panier helpers ── */
  function ajouterAuPanier(produitId, qte = 1) {
    setPanier((prev) => ({ ...prev, [produitId]: (prev[produitId] || 0) + qte }));
  }

  function retirerDuPanier(produitId) {
    setPanier((prev) => {
      const qte = (prev[produitId] || 0) - 1;
      if (qte <= 0) { const n = { ...prev }; delete n[produitId]; return n; }
      return { ...prev, [produitId]: qte };
    });
  }

  function viderPanier() { setPanier({}); }

  /* ── Calculs panier ── */
  const lignesPanier = produits
    .filter((p) => panier[p.id])
    .map((p) => ({
      produit_id: p.id,
      nom: p.nom,
      reference: p.reference,
      quantite: panier[p.id],
      prix_unitaire: p.prixUnitaire,
      sous_total: panier[p.id] * p.prixUnitaire,
    }));

  const totalPanier = lignesPanier.reduce((s, l) => s + l.sous_total, 0);
  const nbArticles = lignesPanier.reduce((s, l) => s + l.quantite, 0);

  /* ── Frais de livraison depuis la config admin de la boutique ── */
  const fraisLivraison    = Number(boutique?.frais_livraison_defaut || 0);
  const livraisonIncluse  = Boolean(boutique?.livraison_incluse_defaut);

  /* ── Total commande ── */
  const totalCommande = livraisonIncluse
    ? totalPanier
    : totalPanier + fraisLivraison;

  /* ── Envoi commande ── */
  async function handleCommande(e) {
    e.preventDefault();
    if (!form.client_nom.trim() || !form.client_telephone.trim()) return;
    if (lignesPanier.length === 0) return;
    try {
      setSubmitting(true);
      const commande = await passerCommande({
        entreprise_id: boutique.entreprise_id,
        boutique_id: boutique.id,
        client_nom: form.client_nom,
        client_telephone: form.client_telephone,
        client_adresse: form.client_adresse,
        notes: form.notes,
        frais_livraison: fraisLivraison,
        livraison_incluse: livraisonIncluse,
        lignes: lignesPanier,
        total: totalCommande,
      });
      const numero = commande?.numero_commande || null;

      /* Réinitialiser panier + formulaire */
      setPanier({});
      setShowForm(false);
      setForm({ client_nom: '', client_telephone: '', client_adresse: '', notes: '' });

      /* Stocker la confirmation pour l'afficher en toast sur la boutique */
      setCommandeConfirmee({ numero, nbArticles: lignesPanier.length });

      /* Nettoyer l'URL (retirer ?produit=) sans recharger la page */
      navigate(`/boutique/${slug}`, { replace: true });

      /* Masquer le toast après 8 secondes */
      setTimeout(() => setCommandeConfirmee(null), 8000);
    } catch {
      alert('Erreur lors de la commande. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  }

  /* ── WhatsApp contact boutique ── */
  function partagerWhatsApp() {
    const numero = boutique?.telephone_whatsapp?.replace(/\D/g, '');
    const url    = window.location.href;
    const msg    = `Bonjour, je souhaite passer une commande sur ${boutique?.nom_boutique} !\n${url}`;
    if (numero) {
      // Numéro configuré → ouvre directement la conversation avec ce numéro
      window.open(`https://wa.me/${numero}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      // Pas de numéro configuré → partage simple du lien
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    }
  }

  /* ── Ouvrir modal détail ── */
  function ouvrirDetail(produit) {
    setDetailProduit(produit);
    setDetailQte(panier[produit.id] || 1);
  }

  function ajouterDepuisDetail() {
    if (!detailProduit) return;
    ajouterAuPanier(detailProduit.id, detailQte - (panier[detailProduit.id] || 0));
    setDetailProduit(null);
  }

  /* ────────────────────────────────────
     ÉTATS : chargement / erreur / succès
  ──────────────────────────────────── */
  if (loading) return (
    <div className="boutique-center">
      <div className="boutique-loader">
        <div className="boutique-spinner" />
        <span>Chargement de la boutique…</span>
      </div>
    </div>
  );

  if (erreur) return (
    <div className="boutique-center">
      <div className="boutique-center-box">
        <div style={{ marginBottom: '14px' }}><IconSearch size={40} style={{ opacity: 0.4 }} /></div>
        <h2>Boutique introuvable</h2>
        <p>{erreur}</p>
      </div>
    </div>
  );

  /* ── Logo / placeholder ── */
  const logoUrl = boutique.entreprises?.logo_url;

  return (
    <div className="boutique-page">

      {/* ════════════════════════════════
          TOAST CONFIRMATION COMMANDE
      ════════════════════════════════ */}
      {commandeConfirmee && (
        <div className="boutique-toast-success">
          <div className="boutique-toast-icon"><IconSuccess size={22} style={{ color: '#16a34a' }} /></div>
          <div className="boutique-toast-content">
            <p className="boutique-toast-title">Commande envoyée !</p>
            <p className="boutique-toast-sub">
              Le vendeur vous contactera très bientôt.
              {commandeConfirmee.numero && (
                <> Numéro : <strong>{commandeConfirmee.numero}</strong></>
              )}
            </p>
          </div>
          <div className="boutique-toast-actions">
            {commandeConfirmee.numero && (
              <a
                href={`/suivi/${commandeConfirmee.numero}`}
                className="boutique-toast-suivi"
                style={{ color: couleur }}
              >
                Suivre →
              </a>
            )}
            <button
              className="boutique-toast-close"
              onClick={() => setCommandeConfirmee(null)}
              type="button"
            >
              <IconX size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          NAVBAR STICKY
      ════════════════════════════════ */}
      <nav className="boutique-navbar">
        <div className="boutique-navbar-brand">
          {logoUrl ? (
            <img src={logoUrl} alt="logo" className="boutique-navbar-logo" />
          ) : (
            <div className="boutique-navbar-logo-placeholder" style={{ background: couleur }}>
              {(boutique.nom_boutique || 'B')[0].toUpperCase()}
            </div>
          )}
          <span className="boutique-navbar-name">{boutique.nom_boutique}</span>
        </div>

        <div className="boutique-navbar-actions">
          {/* Bouton WhatsApp */}
          <button className="boutique-whatsapp-btn" onClick={partagerWhatsApp} type="button">
            <IconWhatsApp size={16} />
            <span className="boutique-whatsapp-label">Partager</span>
          </button>

          {/* Bouton panier si articles */}
          {nbArticles > 0 && (
            <button
              className="boutique-cart-btn"
              style={{ background: couleur }}
              onClick={() => setShowForm(true)}
              type="button"
            >
              <IconCart size={16} />
              <span className="boutique-cart-badge">{nbArticles}</span>
              <span className="boutique-cart-total">{formatGNF(totalPanier)}</span>
            </button>
          )}
        </div>
      </nav>

      {/* ════════════════════════════════
          HERO
      ════════════════════════════════ */}
      <section
        className="boutique-hero"
        style={{ background: `linear-gradient(135deg, ${couleur}ee 0%, ${couleur}bb 100%)` }}
      >
        {/* Overlay subtil */}
        <div
          className="boutique-hero-overlay"
          style={{ background: 'rgba(0,0,0,0.08)' }}
        />
        <div className="boutique-hero-content">
          {logoUrl ? (
            <img src={logoUrl} alt="logo" className="boutique-hero-logo" />
          ) : (
            <div
              className="boutique-hero-logo-placeholder"
              style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
            >
              {(boutique.nom_boutique || 'B')[0].toUpperCase()}
            </div>
          )}
          <h1 style={{ color: '#ffffff' }}>{boutique.nom_boutique}</h1>
          {boutique.description && (
            <p style={{ color: 'rgba(255,255,255,0.9)' }}>{boutique.description}</p>
          )}
        </div>
      </section>

      {/* ════════════════════════════════
          BARRE RECHERCHE
      ════════════════════════════════ */}
      <div className="boutique-search-bar">
        <div className="boutique-search-wrap">
          <span className="boutique-search-icon"><IconSearch size={16} /></span>
          <input
            type="text"
            className="boutique-search-input"
            placeholder="Rechercher un produit…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="boutique-search-count">
          {produitsFiltres.length} produit{produitsFiltres.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ════════════════════════════════
          GRILLE PRODUITS
      ════════════════════════════════ */}
      <div className="boutique-container">
        {produitsFiltres.length === 0 ? (
          <div className="boutique-empty">
            <div className="boutique-empty-icon">
              {search ? <IconSearch size={40} /> : <IconBox size={40} />}
            </div>
            <h3>{search ? 'Aucun résultat' : 'Aucun produit disponible'}</h3>
            <p>
              {search
                ? `Aucun produit ne correspond à « ${search} ». Essayez un autre terme.`
                : 'Cette boutique ne propose pas encore de produits.'}
            </p>
            {search && (
              <button
                className="boutique-ghost-btn"
                style={{ margin: '16px auto 0', display: 'block' }}
                onClick={() => setSearch('')}
              >
                Effacer la recherche
              </button>
            )}
          </div>
        ) : (
          <div className="boutique-produits-grid-public">
            {produitsFiltres.map((produit) => {
              const qte = panier[produit.id] || 0;
              const enRupture = Number(produit.stock) <= 0;

              return (
                <div key={produit.id} className="boutique-card" id={`produit-${produit.id}`}>
                  {/* ── Image / placeholder ── */}
                  <div className="boutique-card-img-wrap">
                    {produit.image_url ? (
                      <img
                        src={produit.image_url}
                        alt={produit.nom}
                        className="boutique-card-img"
                      />
                    ) : (
                      <div
                        className="boutique-card-img-placeholder"
                        style={{ background: `${couleur}18` }}
                      >
                        <IconBox size={36} style={{ opacity: 0.4 }} />
                      </div>
                    )}

                    {/* Badge rupture */}
                    {enRupture && (
                      <span className="boutique-badge-rupture">Rupture de stock</span>
                    )}

                    {/* Badge stock faible */}
                    {!enRupture && produit.stock <= 5 && (
                      <span className="boutique-badge-stock">
                        Plus que {produit.stock}
                      </span>
                    )}

                    {/* Bouton voir détail */}
                    <button
                      className="boutique-card-detail-btn"
                      type="button"
                      onClick={() => ouvrirDetail(produit)}
                    >
                      Voir détails
                    </button>
                  </div>

                  {/* ── Infos produit ── */}
                  <div
                    className="boutique-card-body"
                    onClick={() => ouvrirDetail(produit)}
                    style={{ cursor: 'pointer' }}
                  >
                    <p className="boutique-card-nom">{produit.nom}</p>
                    <p className="boutique-card-ref">Réf : {produit.reference}</p>
                    <p className="boutique-card-prix" style={{ color: couleur }}>
                      {formatGNF(produit.prixUnitaire)}
                    </p>
                    <p className="boutique-card-stock-info">
                      <span
                        className="boutique-card-stock-dot"
                        style={{ background: enRupture ? '#dc2626' : '#22c55e' }}
                      />
                      {enRupture
                        ? 'Rupture de stock'
                        : `${produit.stock} en stock`}
                    </p>
                  </div>

                  {/* ── Contrôles panier ── */}
                  <div style={{ padding: '0 16px 16px' }}>
                    {enRupture ? (
                      <button className="boutique-add-btn" disabled style={{ background: '#94a3b8' }}>
                        Indisponible
                      </button>
                    ) : qte === 0 ? (
                      <button
                        className="boutique-add-btn"
                        style={{ background: couleur }}
                        onClick={() => ajouterAuPanier(produit.id)}
                        type="button"
                      >
                        + Ajouter au panier
                      </button>
                    ) : (
                      <div className="boutique-qte-controls">
                        <button
                          className="boutique-qte-btn"
                          onClick={() => retirerDuPanier(produit.id)}
                          type="button"
                        >
                          −
                        </button>
                        <span className="boutique-qte-val">{qte}</span>
                        <button
                          className="boutique-qte-btn"
                          style={{ background: couleur, color: '#fff' }}
                          onClick={() => ajouterAuPanier(produit.id)}
                          disabled={qte >= produit.stock}
                          type="button"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Barre sticky panier ── */}
        {nbArticles > 0 && (
          <div className="boutique-sticky-bar">
            <div className="boutique-sticky-inner">
              <div className="boutique-sticky-info">
                <span className="boutique-sticky-label">
                  {nbArticles} article{nbArticles > 1 ? 's' : ''} dans le panier
                </span>
                <span className="boutique-sticky-total">{formatGNF(totalPanier)}</span>
              </div>
              <div className="boutique-sticky-actions">
                <button
                  className="boutique-ghost-btn"
                  onClick={viderPanier}
                  type="button"
                >
                  Vider
                </button>
                <button
                  className="boutique-cart-btn"
                  style={{ background: couleur }}
                  onClick={() => setShowForm(true)}
                  type="button"
                >
                  Commander →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════
          MODAL DÉTAIL PRODUIT
      ════════════════════════════════ */}
      {detailProduit && (
        <div
          className="boutique-detail-overlay"
          onClick={() => setDetailProduit(null)}
        >
          <div
            className="boutique-detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image */}
            {detailProduit.image_url ? (
              <img
                src={detailProduit.image_url}
                alt={detailProduit.nom}
                className="boutique-detail-img"
              />
            ) : (
              <div
                className="boutique-detail-img-placeholder"
                style={{ background: `${couleur}18` }}
              >
                <IconBox size={52} style={{ opacity: 0.35 }} />
              </div>
            )}

            <div className="boutique-detail-body">
              <div className="boutique-detail-header">
                <h2 className="boutique-detail-nom">{detailProduit.nom}</h2>
                <button
                  className="boutique-detail-close"
                  onClick={() => setDetailProduit(null)}
                  type="button"
                >
                  ✕
                </button>
              </div>

              <p className="boutique-detail-ref">Réf : {detailProduit.reference}</p>

              <p className="boutique-detail-prix" style={{ color: couleur }}>
                {formatGNF(detailProduit.prixUnitaire)}
              </p>

              <div className="boutique-detail-stock-row">
                <span
                  className={`boutique-detail-stock-pill ${Number(detailProduit.stock) > 0 ? 'en-stock' : 'rupture'}`}
                >
                  {Number(detailProduit.stock) > 0
                    ? `✓ En stock — ${detailProduit.stock} disponible${detailProduit.stock > 1 ? 's' : ''}`
                    : '✗ Rupture de stock'}
                </span>
              </div>

              {/* Actions */}
              {Number(detailProduit.stock) > 0 && (
                <div className="boutique-detail-actions">
                  <div className="boutique-detail-qte">
                    <button
                      className="boutique-qte-btn"
                      onClick={() => setDetailQte((q) => Math.max(1, q - 1))}
                      type="button"
                    >
                      −
                    </button>
                    <span className="boutique-qte-val">{detailQte}</span>
                    <button
                      className="boutique-qte-btn"
                      style={{ background: couleur, color: '#fff' }}
                      onClick={() => setDetailQte((q) => Math.min(detailProduit.stock, q + 1))}
                      disabled={detailQte >= detailProduit.stock}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                  <button
                    className="boutique-detail-add-btn"
                    style={{ background: couleur }}
                    onClick={ajouterDepuisDetail}
                    type="button"
                  >
                    + Ajouter au panier — {formatGNF(detailQte * detailProduit.prixUnitaire)}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          MODAL FORMULAIRE COMMANDE
      ════════════════════════════════ */}
      {showForm && (
        <div className="boutique-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="boutique-modal" onClick={(e) => e.stopPropagation()}>
            <div className="boutique-modal-head">
              <h2>Votre commande</h2>
              <button
                className="boutique-modal-close"
                onClick={() => setShowForm(false)}
                type="button"
              >
                ✕
              </button>
            </div>

            {/* ── Visuel produit (1 seul produit = lien boosté) ── */}
            {lignesPanier.length === 1 && (() => {
              const p = produits.find((x) => x.id === lignesPanier[0].produit_id);
              if (!p) return null;
              return (
                <div className="boutique-modal-produit-banner" style={{ borderColor: `${couleur}33` }}>
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.nom} className="boutique-modal-produit-img" />
                  ) : (
                    <div className="boutique-modal-produit-img-placeholder" style={{ background: `${couleur}18` }}>
                      <IconBox size={32} style={{ opacity: 0.4 }} />
                    </div>
                  )}
                  <div className="boutique-modal-produit-info">
                    <p className="boutique-modal-produit-nom">{p.nom}</p>
                    <p className="boutique-modal-produit-ref">Réf : {p.reference}</p>
                    <p className="boutique-modal-produit-prix" style={{ color: couleur }}>
                      {formatGNF(p.prixUnitaire)} <span className="boutique-modal-produit-qte">× {lignesPanier[0].quantite}</span>
                    </p>
                  </div>
                  <div className="boutique-modal-produit-check" style={{ background: `${couleur}15`, borderColor: `${couleur}33` }}>
                    <IconSuccess size={20} style={{ color: couleur }} />
                    <span style={{ color: couleur, fontSize: '0.72rem', fontWeight: 700 }}>Dans<br/>le panier</span>
                  </div>
                </div>
              );
            })()}

              {/* Récap total avec frais de livraison configurés par l'admin */}
              <div className="boutique-recap-box">
                {lignesPanier.map((l) => (
                  <div key={l.produit_id} className="boutique-recap-ligne">
                    <span>{l.nom} × {l.quantite}</span>
                    <span className="boutique-recap-montant">{formatGNF(l.sous_total)}</span>
                  </div>
                ))}
                <div className="boutique-recap-ligne">
                  <span>Sous-total</span>
                  <span>{formatGNF(totalPanier)}</span>
                </div>
                {fraisLivraison > 0 && !livraisonIncluse && (
                  <div className="boutique-recap-ligne">
                    <span>Frais de livraison</span>
                    <span>+ {formatGNF(fraisLivraison)}</span>
                  </div>
                )}
                {fraisLivraison > 0 && livraisonIncluse && (
                  <div className="boutique-recap-ligne" style={{ color: '#16a34a', fontSize: '0.85rem' }}>
                    <span>Livraison incluse</span>
                    <span>Offerte</span>
                  </div>
                )}
                <div className="boutique-recap-ligne total">
                  <span>Total à payer</span>
                  <span style={{ color: couleur }}>{formatGNF(totalCommande)}</span>
                </div>
              </div>

            {/* Formulaire */}
            <form onSubmit={handleCommande}>
              <div className="form-group">
                <label>Nom complet *</label>
                <input
                  type="text"
                  required
                  placeholder="Votre nom"
                  value={form.client_nom}
                  onChange={(e) => setForm((f) => ({ ...f, client_nom: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Téléphone *</label>
                <input
                  type="tel"
                  required
                  placeholder="+224 6XX XXX XXX"
                  value={form.client_telephone}
                  onChange={(e) => setForm((f) => ({ ...f, client_telephone: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Adresse de livraison</label>
                <input
                  type="text"
                  placeholder="Votre adresse (optionnel)"
                  value={form.client_adresse}
                  onChange={(e) => setForm((f) => ({ ...f, client_adresse: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  placeholder="Instructions spéciales (optionnel)"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <button
                type="submit"
                className="boutique-submit-btn"
                style={{ background: couleur }}
                disabled={submitting}
              >
                {submitting
                  ? 'Envoi en cours…'
                  : `Confirmer la commande — ${formatGNF(totalCommande)}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
