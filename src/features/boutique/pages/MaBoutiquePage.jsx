import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  getMyBoutique,
  createBoutique,
  updateBoutique,
  toggleBoutique,
  getBoutiqueProduits,
  addProduitBoutique,
  removeProduitBoutique,
  updatePrixVenteBoutique,
  uploadBoutiqueLogo,
  uploadBoutiqueBanniere,
  getStatsCommandes,
} from '../services/boutiqueService';
import { getProduits } from '../../produits/services/produitsService';
import { IconStore, IconBox, IconImage } from '../components/BoutiqueIcons';

const APP_URL = window.location.origin;

const ONGLETS = [
  { id: 'apercu',          label: 'Aperçu' },
  { id: 'parametres',      label: 'Paramètres' },
  { id: 'personnalisation', label: 'Personnalisation' },
  { id: 'produits',        label: 'Produits' },
];

function formatGNF(v) {
  return new Intl.NumberFormat('fr-FR').format(Number(v || 0)) + ' GNF';
}

export default function MaBoutiquePage() {
  const { entreprise } = useOutletContext() || {};

  /* ── Data ── */
  const [boutique, setBoutique]         = useState(null);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [erreur, setErreur]             = useState(null);
  const [succes, setSucces]             = useState(null);
  const [stats, setStats]               = useState(null);

  /* ── Onglet actif ── */
  const [onglet, setOnglet] = useState('apercu');

  /* ── Formulaire paramètres ── */
  const [form, setForm] = useState({
    nom_boutique: '',
    description: '',
    slogan: '',
    couleur_principale: '#1d4ed8',
    couleur_secondaire: '#ffffff',
    telephone_whatsapp: '',
    frais_livraison_defaut: 0,
    livraison_incluse_defaut: false,
  });

  /* ── Aperçu live : forme locale des couleurs ── */
  const [previewCouleur, setPreviewCouleur] = useState('#1d4ed8');
  const [previewCouleur2, setPreviewCouleur2] = useState('#ffffff');

  /* ── Upload logo / bannière ── */
  const [logoFile, setLogoFile]         = useState(null);
  const [logoPreview, setLogoPreview]   = useState(null);
  const [banniereFile, setBanniereFile] = useState(null);
  const [bannierePreview, setBannierePreview] = useState(null);
  const [uploadingLogo, setUploadingLogo]     = useState(false);
  const [uploadingBanniere, setUploadingBanniere] = useState(false);
  const logoInputRef     = useRef(null);
  const banniereInputRef = useRef(null);

  /* ── Produits ── */
  const [tousLesProduits, setTousLesProduits] = useState([]);
  const [produitsActifs, setProduitsActifs]   = useState([]);
  const [prixVente, setPrixVente]             = useState({});
  const [produitLoading, setProduitLoading]   = useState(null);
  const [lienCopie, setLienCopie]             = useState(false);
  const [lienProduitCopie, setLienProduitCopie] = useState(null); // id du produit copié

  function copierLienProduit(produit) {
    if (!boutique?.slug || !produit.reference) return;
    const lien = `${APP_URL}/boutique/${boutique.slug}?produit=${encodeURIComponent(produit.reference)}`;
    navigator.clipboard.writeText(lien).then(() => {
      setLienProduitCopie(produit.id);
      setTimeout(() => setLienProduitCopie(null), 2000);
    });
  }

  /* ────────────────── LOAD ─────────────────── */
  async function load() {
    try {
      setLoading(true);
      const [b, prods, st] = await Promise.all([
        getMyBoutique(),
        getProduits(),
        getStatsCommandes().catch(() => null),
      ]);
      setTousLesProduits(prods || []);
      setStats(st);
      if (b) {
        setBoutique(b);
        const f = {
          nom_boutique:      b.nom_boutique      || '',
          description:       b.description       || '',
          slogan:            b.slogan            || '',
          couleur_principale: b.couleur_principale || '#1d4ed8',
          couleur_secondaire: b.couleur_secondaire || '#ffffff',
          telephone_whatsapp:       b.telephone_whatsapp       || '',
          frais_livraison_defaut:   b.frais_livraison_defaut   || 0,
          livraison_incluse_defaut: b.livraison_incluse_defaut || false,
        };
        setForm(f);
        setPreviewCouleur(f.couleur_principale);
        setPreviewCouleur2(f.couleur_secondaire);
        setLogoPreview(b.logo_url || null);
        setBannierePreview(b.banniere_url || null);
        const actifs = await getBoutiqueProduits(b.id);
        setProduitsActifs(actifs.map((p) => p.id));
        const prix = {};
        actifs.forEach((p) => { if (p.prix_vente) prix[p.id] = p.prix_vente; });
        setPrixVente(prix);
      }
    } catch {
      setErreur('Erreur lors du chargement.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  /* ────────────────── FLASH ─────────────────── */
  function flash(msg, isError = false) {
    if (isError) {
      setErreur(msg); setTimeout(() => setErreur(null), 4000);
    } else {
      setSucces(msg); setTimeout(() => setSucces(null), 3000);
    }
  }

  /* ────────────────── CRÉATION ──────────────── */
  async function handleCreate(e) {
    e.preventDefault();
    try {
      setSaving(true);
      const b = await createBoutique({
        nom_boutique:             form.nom_boutique || entreprise?.nom,
        description:              form.description,
        slogan:                   form.slogan,
        couleur_principale:       form.couleur_principale,
        couleur_secondaire:       form.couleur_secondaire,
        telephone_whatsapp:       form.telephone_whatsapp,
        frais_livraison_defaut:   form.frais_livraison_defaut,
        livraison_incluse_defaut: form.livraison_incluse_defaut,
      });
      setBoutique(b);
      flash('Boutique créée avec succès !');
      setOnglet('parametres');
    } catch (e) {
      flash(e.message || 'Erreur lors de la création.', true);
    } finally {
      setSaving(false);
    }
  }

  /* ────────────────── SAUVEGARDE ─────────────── */
  async function handleSave(e) {
    e?.preventDefault();
    if (!boutique) return;
    try {
      setSaving(true);
      const b = await updateBoutique(boutique.id, form);
      setBoutique(b);
      setPreviewCouleur(form.couleur_principale);
      setPreviewCouleur2(form.couleur_secondaire);
      flash('Paramètres sauvegardés !');
    } catch (e) {
      flash(e.message || 'Erreur.', true);
    } finally {
      setSaving(false);
    }
  }

  /* ────────────────── TOGGLE ──────────────────── */
  async function handleToggle() {
    if (!boutique) return;
    try {
      setSaving(true);
      const b = await toggleBoutique(boutique.id, !boutique.actif);
      setBoutique(b);
      flash(b.actif ? 'Boutique activée !' : 'Boutique désactivée.');
    } catch (e) {
      flash(e.message || 'Erreur.', true);
    } finally {
      setSaving(false);
    }
  }

  /* ────────────────── UPLOAD LOGO ─────────────── */
  function onLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function handleUploadLogo() {
    if (!logoFile || !boutique) return;
    try {
      setUploadingLogo(true);
      const url = await uploadBoutiqueLogo(logoFile, boutique.entreprise_id);
      const b = await updateBoutique(boutique.id, { logo_url: url });
      setBoutique(b);
      setLogoPreview(url);
      setLogoFile(null);
      flash('Logo mis à jour !');
    } catch (e) {
      flash(e.message || 'Erreur upload logo.', true);
    } finally {
      setUploadingLogo(false);
    }
  }

  /* ────────────────── UPLOAD BANNIÈRE ─────────── */
  function onBanniereChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBanniereFile(file);
    setBannierePreview(URL.createObjectURL(file));
  }

  async function handleUploadBanniere() {
    if (!banniereFile || !boutique) return;
    try {
      setUploadingBanniere(true);
      const url = await uploadBoutiqueBanniere(banniereFile, boutique.entreprise_id);
      const b = await updateBoutique(boutique.id, { banniere_url: url });
      setBoutique(b);
      setBannierePreview(url);
      setBanniereFile(null);
      flash('Bannière mise à jour !');
    } catch (e) {
      flash(e.message || 'Erreur upload bannière.', true);
    } finally {
      setUploadingBanniere(false);
    }
  }

  /* ────────────────── PRODUITS ─────────────────── */
  async function handleToggleProduit(produit) {
    if (!boutique) return;
    const estActif = produitsActifs.includes(produit.id);
    try {
      setProduitLoading(produit.id);
      if (estActif) {
        await removeProduitBoutique(boutique.id, produit.id);
        setProduitsActifs((prev) => prev.filter((id) => id !== produit.id));
        setPrixVente((prev) => { const n = { ...prev }; delete n[produit.id]; return n; });
      } else {
        await addProduitBoutique(boutique.id, produit.id, boutique.entreprise_id, prixVente[produit.id] || null);
        setProduitsActifs((prev) => [...prev, produit.id]);
      }
    } catch (e) {
      flash(e.message || 'Erreur.', true);
    } finally {
      setProduitLoading(null);
    }
  }

  async function handleSavePrix(produit) {
    if (!boutique || !produitsActifs.includes(produit.id)) return;
    try {
      setProduitLoading(produit.id);
      await updatePrixVenteBoutique(boutique.id, produit.id, prixVente[produit.id] || null);
      flash(`Prix de "${produit.nom}" mis à jour.`);
    } catch (e) {
      flash(e.message || 'Erreur.', true);
    } finally {
      setProduitLoading(null);
    }
  }

  async function selectionnerTout() {
    if (!boutique) return;
    const aAjouter = tousLesProduits.filter((p) => !produitsActifs.includes(p.id));
    if (!aAjouter.length) return;
    try {
      await Promise.all(aAjouter.map((p) => addProduitBoutique(boutique.id, p.id, boutique.entreprise_id)));
      setProduitsActifs(tousLesProduits.map((p) => p.id));
      flash(`${aAjouter.length} produit(s) ajouté(s).`);
    } catch (e) { flash(e.message || 'Erreur.', true); }
  }

  async function deselectionnerTout() {
    if (!boutique) return;
    const aRetirer = tousLesProduits.filter((p) => produitsActifs.includes(p.id));
    if (!aRetirer.length) return;
    try {
      await Promise.all(aRetirer.map((p) => removeProduitBoutique(boutique.id, p.id)));
      setProduitsActifs([]);
      flash(`${aRetirer.length} produit(s) retiré(s).`);
    } catch (e) { flash(e.message || 'Erreur.', true); }
  }

  function copierLien() {
    navigator.clipboard.writeText(`${APP_URL}/boutique/${boutique?.slug}`).then(() => {
      setLienCopie(true);
      setTimeout(() => setLienCopie(false), 2000);
    });
  }

  /* ────────────────── RENDU ─────────────────── */
  if (loading) return (
    <section className="page-card">
      <p>Chargement...</p>
    </section>
  );

  const lienBoutique  = boutique ? `${APP_URL}/boutique/${boutique.slug}` : null;
  const couleurActive = previewCouleur || boutique?.couleur_principale || '#1d4ed8';

  /* ── Pas de boutique ── */
  if (!boutique) return (
    <section className="page-card">
      <div className="section-head">
        <div>
          <h2>Ma Boutique en ligne</h2>
          <p>Créez votre vitrine et commencez à vendre en ligne.</p>
        </div>
      </div>
      {erreur && <p className="error-text mb-flash">{erreur}</p>}
      {succes && <p className="success-text mb-flash">{succes}</p>}

      <div className="boutique-create-box">
        <div className="boutique-create-icon"><IconStore size={48} style={{ opacity: 0.65 }} /></div>
        <h3>Créez votre boutique en ligne</h3>
        <p>
          Publiez vos produits et partagez votre lien unique. Vos clients commandent
          directement depuis leur téléphone.
        </p>
        <form className="boutique-create-form" onSubmit={handleCreate}>
          <div className="form-group">
            <label>Nom de la boutique</label>
            <input
              type="text"
              placeholder={entreprise?.nom || 'Ma boutique'}
              value={form.nom_boutique}
              onChange={(e) => setForm((f) => ({ ...f, nom_boutique: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Slogan (optionnel)</label>
            <input
              type="text"
              placeholder="Ex : Qualité & rapidité garanties"
              value={form.slogan}
              onChange={(e) => setForm((f) => ({ ...f, slogan: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Description (optionnel)</label>
            <textarea
              placeholder="Décrivez votre boutique..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Couleur principale</label>
            <div className="color-picker-row">
              <input type="color" className="color-picker-input" value={form.couleur_principale}
                onChange={(e) => setForm((f) => ({ ...f, couleur_principale: e.target.value }))} />
              <span className="color-picker-value">{form.couleur_principale}</span>
            </div>
          </div>
          <div className="form-actions">
            <button className="primary-btn" type="submit" disabled={saving}>
              {saving ? 'Création...' : 'Créer ma boutique'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );

  /* ════════════════════════════════════════════
     BOUTIQUE EXISTANTE — Layout avec onglets
  ════════════════════════════════════════════ */
  return (
    <>
      {/* ── Header ── */}
      <section className="page-card">
        <div className="section-head">
          <div>
            <h2>Ma Boutique en ligne</h2>
            <p>Gérez votre vitrine, personnalisez-la et suivez vos commandes.</p>
          </div>
          <div className="boutique-header-actions">
            <button
              className={boutique.actif ? 'danger-btn' : 'primary-btn'}
              type="button"
              onClick={handleToggle}
              disabled={saving}
            >
              {saving ? '...' : boutique.actif ? 'Désactiver' : 'Activer la boutique'}
            </button>
          </div>
        </div>

        {erreur && <p className="error-text mb-flash">{erreur}</p>}
        {succes && <p className="success-text mb-flash">{succes}</p>}

        {/* ── Statut + lien ── */}
        <div className={`boutique-statut-link ${boutique.actif ? 'active' : 'inactive'}`}>
          <div className="boutique-statut-info">
            <span className={`boutique-statut-badge ${boutique.actif ? 'active' : 'inactive'}`}>
              {boutique.actif ? '● Boutique active' : '○ Boutique inactive'}
            </span>
            <p className="boutique-link-text">{lienBoutique}</p>
          </div>
          <div className="boutique-link-actions">
            <button className="secondary-outline-btn" onClick={copierLien} type="button">
              {lienCopie ? '✓ Copié !' : 'Copier le lien'}
            </button>
            {boutique.actif && (
              <a href={lienBoutique} target="_blank" rel="noreferrer" className="secondary-outline-btn">
                Voir la boutique ↗
              </a>
            )}
          </div>
        </div>

        {/* ── KPIs stats ── */}
        {stats && (
          <div className="boutique-stats-grid">
            <div className="boutique-stat-card">
              <div className="boutique-stat-label">Commandes total</div>
              <div className="boutique-stat-value">{stats.total}</div>
            </div>
            <div className="boutique-stat-card">
              <div className="boutique-stat-label">En attente</div>
              <div className="boutique-stat-value kpi-value--warning">{stats.en_attente}</div>
            </div>
            <div className="boutique-stat-card">
              <div className="boutique-stat-label">Livrées</div>
              <div className="boutique-stat-value kpi-value--success">{stats.livree}</div>
            </div>
            <div className="boutique-stat-card">
              <div className="boutique-stat-label">CA ce mois</div>
              <div className="boutique-stat-value boutique-stat-ca">{formatGNF(stats.ca_mois)}</div>
            </div>
            <div className="boutique-stat-card boutique-stat-card--wide">
              <div className="boutique-stat-label">CA total boutique</div>
              <div className="boutique-stat-value kpi-value--accent">{formatGNF(stats.ca_total)}</div>
            </div>
          </div>
        )}
      </section>

      {/* ── Onglets ── */}
      <section className="page-card">
        <nav className="boutique-onglets">
          {ONGLETS.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`boutique-onglet-btn${onglet === o.id ? ' active' : ''}`}
              style={onglet === o.id ? { borderBottomColor: couleurActive, color: couleurActive } : {}}
              onClick={() => setOnglet(o.id)}
            >
              {o.label}
            </button>
          ))}
        </nav>

        {/* ════ ONGLET APERÇU ════ */}
        {onglet === 'apercu' && (
          <div className="boutique-apercu-wrap">
            <p className="boutique-apercu-hint">
              Voici comment votre boutique apparaît à vos clients.
            </p>
            {/* Mini-preview hero */}
            <div className="boutique-preview-hero"
              style={{ background: `linear-gradient(135deg, ${couleurActive}ee 0%, ${couleurActive}99 100%)` }}>
              <div className="boutique-preview-hero-content">
                {logoPreview ? (
                  <img src={logoPreview} alt="logo" className="boutique-preview-logo" />
                ) : (
                  <div className="boutique-preview-logo-placeholder"
                    style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}>
                    {(form.nom_boutique || boutique.nom_boutique || 'B')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="boutique-preview-nom" style={{ color: '#fff' }}>
                    {form.nom_boutique || boutique.nom_boutique}
                  </h3>
                  {(form.slogan || boutique.slogan) && (
                    <p className="boutique-preview-slogan" style={{ color: 'rgba(255,255,255,0.88)' }}>
                      {form.slogan || boutique.slogan}
                    </p>
                  )}
                  {(form.description || boutique.description) && (
                    <p className="boutique-preview-desc" style={{ color: 'rgba(255,255,255,0.75)' }}>
                      {form.description || boutique.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="boutique-preview-badge">Aperçu live</div>
            </div>

            {/* Produits preview */}
            {tousLesProduits.filter((p) => produitsActifs.includes(p.id)).length > 0 && (
              <div className="boutique-preview-produits">
                {tousLesProduits
                  .filter((p) => produitsActifs.includes(p.id))
                  .slice(0, 4)
                  .map((p) => (
                    <div key={p.id} className="boutique-preview-card">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.nom} className="boutique-preview-card-img" />
                      ) : (
                        <div className="boutique-preview-card-img-placeholder"
                          style={{ background: `${couleurActive}18` }}>
                          <IconBox size={28} style={{ opacity: 0.4 }} />
                        </div>
                      )}
                      <div className="boutique-preview-card-body">
                        <p className="boutique-preview-card-nom">{p.nom}</p>
                        <p className="boutique-preview-card-prix" style={{ color: couleurActive }}>
                          {new Intl.NumberFormat('fr-FR').format(prixVente[p.id] || p.prixUnitaire)} GNF
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            <div className="boutique-apercu-actions">
              <button className="secondary-outline-btn" type="button" onClick={() => setOnglet('parametres')}>
                Modifier les paramètres
              </button>
              {boutique.actif && (
                <a href={lienBoutique} target="_blank" rel="noreferrer" className="primary-btn">
                  Voir la vraie boutique ↗
                </a>
              )}
            </div>
          </div>
        )}

        {/* ════ ONGLET PARAMÈTRES ════ */}
        {onglet === 'parametres' && (
          <form onSubmit={handleSave} className="boutique-onglet-content">
            <div className="product-form-grid">
              <div className="form-group">
                <label>Nom de la boutique</label>
                <input type="text" value={form.nom_boutique}
                  onChange={(e) => setForm((f) => ({ ...f, nom_boutique: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Slogan</label>
                <input type="text" placeholder="Ex : Qualité & service garanti"
                  value={form.slogan}
                  onChange={(e) => setForm((f) => ({ ...f, slogan: e.target.value }))} />
              </div>
              <div className="form-group form-group--full">
                <label>Description</label>
                <textarea placeholder="Décrivez votre boutique..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="form-group form-group--full">
                <label>Lien unique (slug)</label>
                <input type="text" value={boutique.slug} readOnly className="input-readonly" />
                <p className="form-hint">Non modifiable après création.</p>
              </div>

              {/* ── Séparateur ── */}
              <div className="form-group form-group--full">
                <h4 className="boutique-section-label">Contact & WhatsApp</h4>
              </div>

              <div className="form-group form-group--full">
                <label>Numéro WhatsApp</label>
                <input
                  type="tel"
                  placeholder="Ex : 224622000000 (sans + ni espace)"
                  value={form.telephone_whatsapp}
                  onChange={(e) => setForm((f) => ({ ...f, telephone_whatsapp: e.target.value.replace(/\D/g, '') }))}
                />
                <p className="form-hint">
                  Ce numéro sera utilisé pour le bouton WhatsApp sur votre boutique publique.
                  Format international sans le + (ex : 224622000000).
                </p>
              </div>

              {/* ── Séparateur ── */}
              <div className="form-group form-group--full">
                <h4 className="boutique-section-label">Livraison</h4>
              </div>

              <div className="form-group">
                <label>Frais de livraison par défaut (GNF)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.frais_livraison_defaut || ''}
                  onChange={(e) => setForm((f) => ({ ...f, frais_livraison_defaut: Number(e.target.value) || 0 }))}
                />
                <p className="form-hint">
                  Ce montant sera automatiquement appliqué à chaque commande client.
                </p>
              </div>

              <div className="form-group">
                <label>Politique de livraison</label>
                <div className="boutique-livraison-toggle" style={{ marginTop: '8px' }}>
                  <button
                    type="button"
                    className={`boutique-livraison-btn${!form.livraison_incluse_defaut ? ' active' : ''}`}
                    style={!form.livraison_incluse_defaut ? { background: couleurActive } : {}}
                    onClick={() => setForm((f) => ({ ...f, livraison_incluse_defaut: false }))}
                  >
                    Client paie la livraison
                  </button>
                  <button
                    type="button"
                    className={`boutique-livraison-btn${form.livraison_incluse_defaut ? ' active' : ''}`}
                    style={form.livraison_incluse_defaut ? { background: couleurActive } : {}}
                    onClick={() => setForm((f) => ({ ...f, livraison_incluse_defaut: true }))}
                  >
                    Livraison incluse (à votre charge)
                  </button>
                </div>
                <p className="form-hint" style={{ marginTop: '6px' }}>
                  {form.livraison_incluse_defaut
                    ? `Les frais de livraison sont à votre charge — déduits de votre bénéfice.`
                    : `Les frais de livraison sont ajoutés au total payé par le client.`}
                </p>
              </div>
            </div>
            <div className="form-actions form-actions-row boutique-form-actions">
              <button className="primary-btn" type="submit" disabled={saving}>
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </form>
        )}

        {/* ════ ONGLET PERSONNALISATION ════ */}
        {onglet === 'personnalisation' && (
          <div className="boutique-onglet-content">

            {/* ── Couleurs ── */}
            <div className="boutique-perso-section">
              <h4 className="boutique-perso-title">Couleurs</h4>
              <div className="product-form-grid">
                <div className="form-group">
                  <label>Couleur principale</label>
                  <div className="color-picker-row">
                    <input type="color" className="color-picker-input"
                      value={form.couleur_principale}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm((f) => ({ ...f, couleur_principale: v }));
                        setPreviewCouleur(v);
                      }} />
                    <span className="color-picker-value">{form.couleur_principale}</span>
                  </div>
                </div>
                <div className="form-group">
                  <label>Couleur secondaire</label>
                  <div className="color-picker-row">
                    <input type="color" className="color-picker-input"
                      value={form.couleur_secondaire}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm((f) => ({ ...f, couleur_secondaire: v }));
                        setPreviewCouleur2(v);
                      }} />
                    <span className="color-picker-value">{form.couleur_secondaire}</span>
                  </div>
                </div>
              </div>
              {/* Mini-swatch preview */}
              <div className="boutique-color-swatch">
                <div className="boutique-color-swatch-main" style={{ background: previewCouleur }} />
                <div className="boutique-color-swatch-secondary" style={{ background: previewCouleur2 }} />
                <span className="boutique-color-swatch-label">Aperçu des couleurs</span>
              </div>
            </div>

            {/* ── Logo ── */}
            <div className="boutique-perso-section">
              <h4 className="boutique-perso-title">Logo de la boutique</h4>
              <div className="boutique-upload-row">
                <div className="boutique-upload-preview">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="boutique-upload-preview-img" />
                  ) : (
                    <div className="boutique-upload-preview-placeholder"
                      style={{ background: `${couleurActive}18` }}>
                      <IconImage size={24} style={{ opacity: 0.4 }} />
                    </div>
                  )}
                </div>
                <div className="boutique-upload-controls">
                  <p className="boutique-upload-hint">
                    Format recommandé : carré, PNG ou JPG, min 200×200px.
                  </p>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={onLogoChange}
                  />
                  <div className="boutique-upload-btns">
                    <button
                      type="button"
                      className="secondary-outline-btn boutique-action-sm"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      Choisir un fichier
                    </button>
                    {logoFile && (
                      <button
                        type="button"
                        className="primary-btn boutique-action-sm"
                        onClick={handleUploadLogo}
                        disabled={uploadingLogo}
                      >
                        {uploadingLogo ? 'Upload...' : 'Enregistrer le logo'}
                      </button>
                    )}
                  </div>
                  {logoFile && (
                    <p className="boutique-upload-filename">{logoFile.name}</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Bannière ── */}
            <div className="boutique-perso-section">
              <h4 className="boutique-perso-title">Bannière</h4>
              <div className="boutique-banniere-preview-wrap">
                {bannierePreview ? (
                  <img src={bannierePreview} alt="Bannière" className="boutique-banniere-preview-img" />
                ) : (
                  <div className="boutique-banniere-placeholder"
                    style={{ background: `linear-gradient(135deg, ${couleurActive}44, ${couleurActive}22)` }}>
                    <span>Aucune bannière — votre couleur principale sera utilisée</span>
                  </div>
                )}
              </div>
              <div className="boutique-upload-controls">
                <p className="boutique-upload-hint">
                  Format recommandé : 1200×300px, PNG ou JPG.
                </p>
                <input
                  ref={banniereInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={onBanniereChange}
                />
                <div className="boutique-upload-btns">
                  <button
                    type="button"
                    className="secondary-outline-btn boutique-action-sm"
                    onClick={() => banniereInputRef.current?.click()}
                  >
                    Choisir une bannière
                  </button>
                  {banniereFile && (
                    <button
                      type="button"
                      className="primary-btn boutique-action-sm"
                      onClick={handleUploadBanniere}
                      disabled={uploadingBanniere}
                    >
                      {uploadingBanniere ? 'Upload...' : 'Enregistrer la bannière'}
                    </button>
                  )}
                </div>
                {banniereFile && (
                  <p className="boutique-upload-filename">{banniereFile.name}</p>
                )}
              </div>
            </div>

            {/* Sauvegarder les couleurs */}
            <div className="form-actions form-actions-row boutique-form-actions">
              <button className="primary-btn" type="button" onClick={handleSave} disabled={saving}>
                {saving ? 'Sauvegarde...' : 'Sauvegarder les couleurs'}
              </button>
            </div>
          </div>
        )}

        {/* ════ ONGLET PRODUITS ════ */}
        {onglet === 'produits' && (
          <div className="boutique-onglet-content">
            <div className="boutique-section-head">
              <h3>
                Produits en vitrine
                <span className="boutique-count-badge">
                  {produitsActifs.length} / {tousLesProduits.length}
                </span>
              </h3>
              <div className="boutique-produits-actions">
                <button className="secondary-outline-btn boutique-action-sm" type="button" onClick={selectionnerTout}>
                  Tout ajouter
                </button>
                <button className="secondary-outline-btn boutique-action-sm" type="button" onClick={deselectionnerTout}>
                  Tout retirer
                </button>
              </div>
            </div>

            {tousLesProduits.length === 0 ? (
              <p>Aucun produit dans votre catalogue. Ajoutez des produits d'abord.</p>
            ) : (
              <div className="boutique-produits-grid">
                {tousLesProduits.map((produit) => {
                  const actif = produitsActifs.includes(produit.id);
                  const isLoading = produitLoading === produit.id;
                  const prixPublic = prixVente[produit.id] || '';
                  return (
                    <div
                      key={produit.id}
                      className={`boutique-produit-card${actif ? ' active' : ''}`}
                      style={actif ? { borderColor: couleurActive } : {}}
                    >
                      <div
                        className={`boutique-produit-toggle${isLoading ? ' loading' : ''}`}
                        onClick={() => !isLoading && handleToggleProduit(produit)}
                      >
                        {produit.image_url ? (
                          <img src={produit.image_url} alt={produit.nom} className="product-thumb" />
                        ) : (
                          <div className="product-thumb placeholder">
                            {(produit.nom || 'P')[0].toUpperCase()}
                          </div>
                        )}
                        <div className="boutique-produit-info">
                          <p className="boutique-produit-nom">{produit.nom}</p>
                          <p className="boutique-prix-gros">
                            {new Intl.NumberFormat('fr-FR').format(produit.prixUnitaire)} GNF · Stock : {produit.stock}
                          </p>
                        </div>
                        <div
                          className={`boutique-produit-check${actif ? ' active' : ''}`}
                          style={actif ? { background: couleurActive } : {}}
                        >
                          {actif && <span className="boutique-produit-check-icon">✓</span>}
                        </div>
                      </div>
                      {actif && (
                        <>
                          <div className="boutique-prix-field">
                            <input
                              type="number" min="0"
                              placeholder={`Prix public (défaut : ${new Intl.NumberFormat('fr-FR').format(produit.prixUnitaire)} GNF)`}
                              value={prixPublic}
                              onChange={(e) => setPrixVente((prev) => ({ ...prev, [produit.id]: e.target.value }))}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              className="boutique-prix-save-btn"
                              onClick={(e) => { e.stopPropagation(); handleSavePrix(produit); }}
                              disabled={isLoading} type="button"
                            >
                              {isLoading ? '...' : '✓'}
                            </button>
                          </div>
                          {prixPublic && Number(prixPublic) !== produit.prixUnitaire && (
                            <p className="boutique-prix-public-label">
                              Affiché : {new Intl.NumberFormat('fr-FR').format(prixPublic)} GNF
                            </p>
                          )}
                          {/* Lien direct vers ce produit (pour boost Facebook/WhatsApp) */}
                          {produit.reference && (
                            <div className="boutique-produit-lien-row">
                              <span className="boutique-produit-lien-url" title={`${APP_URL}/boutique/${boutique?.slug}?produit=${produit.reference}`}>
                                {`/boutique/${boutique?.slug}?produit=${produit.reference}`}
                              </span>
                              <button
                                type="button"
                                className={`boutique-produit-copy-btn${lienProduitCopie === produit.id ? ' copied' : ''}`}
                                onClick={(e) => { e.stopPropagation(); copierLienProduit(produit); }}
                                title="Copier le lien direct vers ce produit"
                              >
                                {lienProduitCopie === produit.id ? '✓ Copié !' : 'Copier le lien'}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}
