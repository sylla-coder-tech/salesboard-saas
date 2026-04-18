import { useEffect, useMemo, useState } from 'react';
import { getProduits } from '../../produits/services/produitsService';
import {
  addVente,
  deleteVente,
  getVentes,
  updateVente,
} from '../services/ventesService';

function formatGNF(value) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0)) + ' GNF';
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR');
}

function formatClientName(vente) {
  return [vente.nomClient, vente.prenomClient].filter(Boolean).join(' ') || 'Client non défini';
}

function formatStatut(statut) {
  if (statut === 'payee') return 'Payée';
  if (statut === 'en_attente') return 'En attente';
  if (statut === 'livree') return 'Livrée';
  return statut || '-';
}

function toNumber(value) {
  return Number(value || 0);
}

function createEmptyLine() {
  return {
    produit_id: '',
    quantite: 1,
    prix_unitaire: '',
    prix_achat_unitaire: 0,
  };
}

const initialForm = {
  lignes: [createEmptyLine()],
  fraisLivraison: '',
  nomClient: '',
  prenomClient: '',
  telephone: '',
  adresse: '',
  statut: 'payee',
  dateAchat: '',
};

function groupSales(rows = []) {
  const map = new Map();

  for (const row of rows) {
    const id = row.id;

    if (!map.has(id)) {
      map.set(id, {
        id: row.id,
        entreprise_id: row.entreprise_id,
        nomClient: row.nomClient,
        prenomClient: row.prenomClient,
        telephone: row.telephone,
        adresse: row.adresse,
        statut: row.statut,
        dateAchat: row.dateAchat,
        created_at: row.created_at,
        fraisLivraison: toNumber(row.fraisLivraison),
        benefice: toNumber(row.benefice_net ?? row.benefice),
        total_articles: toNumber(row.total_articles),
        total_vente: toNumber(row.total_vente),
        cout_total_vente: toNumber(row.cout_total_vente),
        quantite_totale: toNumber(row.quantite_totale ?? row.quantite ?? 1),
        lignes: [],
      });
    }

    const vente = map.get(id);

    vente.lignes.push({
      produit_id: row.produit_id,
      nomProduit: row.nomProduit,
      referenceProduit: row.referenceProduit,
      prixUnitaireStock: toNumber(row.prixUnitaire),
      quantite: toNumber(row.quantite || 1),
      prix_unitaire: toNumber(row.prix_unitaire),
      prix_achat_unitaire: toNumber(row.prix_achat_unitaire),
      sous_total: toNumber(row.sous_total),
      cout_total: toNumber(row.cout_total),
      benefice_ligne: toNumber(row.benefice_ligne),
    });
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at || b.dateAchat) - new Date(a.created_at || a.dateAchat)
  );
}

export default function VentesPage() {
  const [produits, setProduits] = useState([]);
  const [ventes, setVentes] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [venteToDelete, setVenteToDelete] = useState(null);
  const [expandedSaleId, setExpandedSaleId] = useState(null);
  const [selectedProduitStatsId, setSelectedProduitStatsId] = useState('');

  async function loadData() {
    try {
      setLoading(true);
      setError('');

      const [produitsData, ventesData] = await Promise.all([
        getProduits(),
        getVentes(),
      ]);

      setProduits(produitsData || []);
      setVentes(groupSales(ventesData || []));
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des ventes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleLineChange(index, field, value) {
    setForm((prev) => {
      const lignes = [...prev.lignes];
      const current = { ...lignes[index], [field]: value };

      if (field === 'produit_id') {
        const produit = produits.find((p) => String(p.id) === String(value));

        if (produit) {
          current.prix_achat_unitaire = toNumber(produit.prixUnitaire || 0);

          if (!current.prix_unitaire) {
            current.prix_unitaire = '';
          }
        }
      }

      lignes[index] = current;
      return { ...prev, lignes };
    });
  }

  function addLine() {
    setForm((prev) => ({
      ...prev,
      lignes: [...prev.lignes, createEmptyLine()],
    }));
  }

  function removeLine(index) {
    setForm((prev) => {
      if (prev.lignes.length === 1) return prev;
      return {
        ...prev,
        lignes: prev.lignes.filter((_, i) => i !== index),
      };
    });
  }

  const lineSummaries = useMemo(() => {
    return form.lignes.map((ligne) => {
      const produit = produits.find((p) => String(p.id) === String(ligne.produit_id)) || null;
      const quantite = toNumber(ligne.quantite || 0);
      const prixVenteUnitaire = toNumber(ligne.prix_unitaire || 0);
      const prixAchatUnitaire =
        toNumber(ligne.prix_achat_unitaire || produit?.prixUnitaire || 0);

      const sousTotal = quantite * prixVenteUnitaire;
      const coutTotal = quantite * prixAchatUnitaire;
      const beneficeLigne = sousTotal - coutTotal;

      return {
        ...ligne,
        produit,
        quantite,
        prixVenteUnitaire,
        prixAchatUnitaire,
        sousTotal,
        coutTotal,
        beneficeLigne,
      };
    });
  }, [form.lignes, produits]);

  const totalArticles = useMemo(
    () => lineSummaries.reduce((sum, ligne) => sum + ligne.sousTotal, 0),
    [lineSummaries]
  );

  const quantiteTotale = useMemo(
    () => lineSummaries.reduce((sum, ligne) => sum + ligne.quantite, 0),
    [lineSummaries]
  );

  const fraisLivraison = useMemo(
    () => toNumber(form.fraisLivraison || 0),
    [form.fraisLivraison]
  );

  const coutTotalVente = useMemo(
    () => lineSummaries.reduce((sum, ligne) => sum + ligne.coutTotal, 0),
    [lineSummaries]
  );

  const beneficeBrut = useMemo(
    () => totalArticles - coutTotalVente,
    [totalArticles, coutTotalVente]
  );

  const beneficeNet = useMemo(
    () => beneficeBrut - fraisLivraison,
    [beneficeBrut, fraisLivraison]
  );

  const totalFacture = useMemo(
    () => totalArticles + fraisLivraison,
    [totalArticles, fraisLivraison]
  );

  const produitStats = useMemo(() => {
    if (!selectedProduitStatsId) return null;

    const produit = produits.find(
      (item) => String(item.id) === String(selectedProduitStatsId)
    );

    if (!produit) return null;

    let nombreVentes = 0;
    let quantiteVendue = 0;
    let totalArticlesProduit = 0;
    let totalFactureProduit = 0;
    let totalLivraisonProduit = 0;
    let beneficeTotalProduit = 0;

    ventes.forEach((vente) => {
      const lignesProduit = (vente.lignes || []).filter(
        (ligne) => String(ligne.produit_id) === String(selectedProduitStatsId)
      );

      if (lignesProduit.length > 0) {
        nombreVentes += 1;

        const totalSousProduit = lignesProduit.reduce(
          (sum, ligne) => sum + toNumber(ligne.sous_total),
          0
        );

        const totalBeneficeProduit = lignesProduit.reduce(
          (sum, ligne) => sum + toNumber(ligne.benefice_ligne),
          0
        );

        const quantiteProduit = lignesProduit.reduce(
          (sum, ligne) => sum + toNumber(ligne.quantite),
          0
        );

        const fraisPartProduit =
          toNumber(vente.total_articles) > 0
            ? (toNumber(vente.fraisLivraison) * totalSousProduit) /
              toNumber(vente.total_articles)
            : 0;

        quantiteVendue += quantiteProduit;
        totalArticlesProduit += totalSousProduit;
        totalFactureProduit += totalSousProduit + fraisPartProduit;
        totalLivraisonProduit += fraisPartProduit;
        beneficeTotalProduit += totalBeneficeProduit - fraisPartProduit;
      }
    });

    return {
      produit,
      nombreVentes,
      quantiteVendue,
      totalArticles: totalArticlesProduit,
      totalFacture: totalFactureProduit,
      totalLivraison: totalLivraisonProduit,
      beneficeTotal: beneficeTotalProduit,
    };
  }, [selectedProduitStatsId, produits, ventes]);

  function handleEdit(vente) {
    setEditingId(vente.id);
    setSuccessMsg('');
    setError('');
    setForm({
      lignes: vente.lignes.map((ligne) => ({
        produit_id: ligne.produit_id || '',
        quantite: ligne.quantite || 1,
        prix_unitaire: ligne.prix_unitaire || '',
        prix_achat_unitaire: ligne.prix_achat_unitaire || ligne.prixUnitaireStock || 0,
      })),
      fraisLivraison: vente.fraisLivraison ?? '',
      nomClient: vente.nomClient || '',
      prenomClient: vente.prenomClient || '',
      telephone: vente.telephone || '',
      adresse: vente.adresse || '',
      statut: vente.statut || 'payee',
      dateAchat: vente.dateAchat
        ? new Date(vente.dateAchat).toISOString().slice(0, 16)
        : '',
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openDeleteModal(vente) {
    setVenteToDelete(vente);
    setDeleteModalOpen(true);
    setError('');
    setSuccessMsg('');
  }

  function closeDeleteModal() {
    if (deleting) return;
    setDeleteModalOpen(false);
    setVenteToDelete(null);
  }

  function toggleSaleDetails(id) {
    setExpandedSaleId((prev) => (prev === id ? null : id));
  }

  async function confirmDelete() {
    if (!venteToDelete) return;

    try {
      setDeleting(true);
      setError('');
      setSuccessMsg('');

      await deleteVente(venteToDelete.id);

      if (editingId === venteToDelete.id) {
        resetForm();
      }

      if (expandedSaleId === venteToDelete.id) {
        setExpandedSaleId(null);
      }

      setSuccessMsg('Vente supprimée avec succès.');
      closeDeleteModal();
      await loadData();
    } catch (err) {
      setError(err.message || 'Erreur lors de la suppression de la vente');
    } finally {
      setDeleting(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      const payload = {
        ...form,
        lignes: form.lignes.map((ligne) => ({
          produit_id: ligne.produit_id,
          quantite: toNumber(ligne.quantite || 1),
          prix_unitaire: toNumber(ligne.prix_unitaire || 0),
        })),
      };

      if (editingId) {
        await updateVente(editingId, payload);
        setSuccessMsg(
          'Informations générales de la vente modifiées avec succès. Les lignes produits ne sont pas encore modifiables.'
        );
      } else {
        await addVente(payload);
        setSuccessMsg('Vente enregistrée avec succès.');
      }

      resetForm();
      await loadData();
    } catch (err) {
      setError(err.message || 'Erreur lors de l’enregistrement de la vente');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="page-card">
        <div className="section-head">
          <div>
            <h2>{editingId ? 'Modifier une vente' : 'Ajouter une vente'}</h2>
            <p>
              {editingId
                ? 'Modifiez les informations générales de la vente sélectionnée.'
                : 'Enregistrez une nouvelle vente multi-produits et mettez le stock à jour automatiquement.'}
            </p>
          </div>
        </div>

        <form className="sales-form-grid ventes-form-grid" onSubmit={handleSubmit}>
          <div className="ventes-form-block ventes-form-block-full">
            <div className="ventes-block-title">Produits de la vente</div>

            <div className="sale-lines-wrap">
              {lineSummaries.map((ligne, index) => (
                <div key={index} className="sale-line-card">
                  <div className="sale-line-grid">
                    <div className="form-group">
                      <label>Produit</label>
                      <select
                        value={ligne.produit_id}
                        onChange={(e) => handleLineChange(index, 'produit_id', e.target.value)}
                        required
                        disabled={!!editingId}
                      >
                        <option value="">Sélectionner un produit</option>
                        {produits.map((produit) => (
                          <option key={produit.id} value={produit.id}>
                            {produit.nom} ({produit.reference}) - Stock: {produit.stock}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Quantité</label>
                      <input
                        type="number"
                        min="1"
                        value={ligne.quantite}
                        onChange={(e) => handleLineChange(index, 'quantite', e.target.value)}
                        required
                        disabled={!!editingId}
                      />
                    </div>

                    <div className="form-group">
                      <label>Prix d’achat</label>
                      <input
                        type="text"
                        value={formatGNF(ligne.prixAchatUnitaire)}
                        readOnly
                      />
                    </div>

                    <div className="form-group">
                      <label>Prix de vente unitaire (GNF)</label>
                      <input
                        type="number"
                        min="0"
                        value={ligne.prix_unitaire}
                        onChange={(e) => handleLineChange(index, 'prix_unitaire', e.target.value)}
                        required
                        disabled={!!editingId}
                      />
                    </div>

                    <div className="form-group">
                      <label>Sous-total</label>
                      <input type="text" value={formatGNF(ligne.sousTotal)} readOnly />
                    </div>
                  </div>

                  <div className="sale-line-summary">
                    <div className="vente-live-item">
                      <span>Produit sélectionné</span>
                      <strong>{ligne.produit?.nom || 'Aucun produit'}</strong>
                    </div>

                    <div className="vente-live-item">
                      <span>Stock actuel</span>
                      <strong>{ligne.produit?.stock ?? '-'}</strong>
                    </div>

                    <div className="vente-live-item">
                      <span>Référence</span>
                      <strong>{ligne.produit?.reference || '-'}</strong>
                    </div>

                    <div className="vente-live-item">
                      <span>Prix d’achat</span>
                      <strong>{formatGNF(ligne.prixAchatUnitaire)}</strong>
                    </div>

                    <div className="vente-live-item">
                      <span>Bénéfice ligne</span>
                      <strong>{formatGNF(ligne.beneficeLigne)}</strong>
                    </div>
                  </div>

                  {!editingId ? (
                    <div className="sale-line-actions">
                      <button
                        type="button"
                        className="secondary-outline-btn"
                        onClick={() => removeLine(index)}
                        disabled={form.lignes.length === 1}
                      >
                        Supprimer cette ligne
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}

              {!editingId ? (
                <button
                  type="button"
                  className="secondary-outline-btn add-line-btn"
                  onClick={addLine}
                >
                  Ajouter un autre produit
                </button>
              ) : null}
            </div>
          </div>

          <div className="ventes-form-block ventes-form-block-full">
            <div className="ventes-block-title">Montants de la vente</div>

            <div className="ventes-form-inner-grid">
              <div className="form-group">
                <label>Total des articles</label>
                <input type="text" value={formatGNF(totalArticles)} readOnly />
              </div>

              <div className="form-group">
                <label>Coût total</label>
                <input type="text" value={formatGNF(coutTotalVente)} readOnly />
              </div>

              <div className="form-group">
                <label>Frais de livraison (GNF)</label>
                <input
                  type="number"
                  name="fraisLivraison"
                  placeholder="Ex: 20000"
                  min="0"
                  value={form.fraisLivraison}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Total facturé</label>
                <input type="text" value={formatGNF(totalFacture)} readOnly />
              </div>

              <div className="form-group">
                <label>Bénéfice brut</label>
                <input type="text" value={formatGNF(beneficeBrut)} readOnly />
              </div>

              <div className="form-group">
                <label>Bénéfice net</label>
                <input type="text" value={formatGNF(beneficeNet)} readOnly />
              </div>
            </div>

            <div className="vente-live-summary">
              <div className="vente-live-item">
                <span>Nombre d’articles</span>
                <strong>{quantiteTotale}</strong>
              </div>

              <div className="vente-live-item">
                <span>Total articles</span>
                <strong>{formatGNF(totalArticles)}</strong>
              </div>

              <div className="vente-live-item">
                <span>Bénéfice net</span>
                <strong>{formatGNF(beneficeNet)}</strong>
              </div>
            </div>
          </div>

          <div className="ventes-form-block ventes-form-block-full">
            <div className="ventes-block-title">Informations client</div>

            <div className="ventes-form-inner-grid">
              <div className="form-group">
                <label>Nom du client</label>
                <input
                  type="text"
                  name="nomClient"
                  placeholder="Nom"
                  value={form.nomClient}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Prénom du client</label>
                <input
                  type="text"
                  name="prenomClient"
                  placeholder="Prénom"
                  value={form.prenomClient}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Téléphone</label>
                <input
                  type="text"
                  name="telephone"
                  placeholder="Ex: 620000000"
                  value={form.telephone}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Adresse</label>
                <input
                  type="text"
                  name="adresse"
                  placeholder="Adresse du client"
                  value={form.adresse}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="ventes-form-block ventes-form-block-full">
            <div className="ventes-block-title">Suivi de la vente</div>

            <div className="ventes-form-inner-grid">
              <div className="form-group">
                <label>Statut</label>
                <select
                  name="statut"
                  value={form.statut}
                  onChange={handleChange}
                  required
                >
                  <option value="payee">Payée</option>
                  <option value="en_attente">En attente</option>
                  <option value="livree">Livrée</option>
                </select>
              </div>

              <div className="form-group">
                <label>Date d’achat</label>
                <input
                  type="datetime-local"
                  name="dateAchat"
                  value={form.dateAchat}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {editingId ? (
            <p className="error-text">
              En mode modification, seules les informations générales de la vente sont modifiables pour le moment.
            </p>
          ) : null}

          {error ? <p className="error-text">{error}</p> : null}
          {successMsg ? <p className="success-text">{successMsg}</p> : null}

          <div className="form-actions form-actions-row">
            <button className="primary-btn" type="submit" disabled={submitting}>
              {submitting
                ? editingId
                  ? 'Modification...'
                  : 'Enregistrement...'
                : editingId
                ? 'Enregistrer les modifications'
                : 'Enregistrer la vente'}
            </button>

            {editingId ? (
              <button
                className="secondary-outline-btn"
                type="button"
                onClick={resetForm}
              >
                Annuler
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="page-card product-stats-card">
  <div className="product-stats-head">
    <div>
      <h3>Statistiques par produit</h3>
      <p>Sélectionnez un produit pour voir ses performances commerciales.</p>
    </div>
  </div>

  <div className="sales-form-grid product-stats-select-wrap">
    <div className="form-group">
      <label>Produit</label>
      <select
        value={selectedProduitStatsId}
        onChange={(e) => setSelectedProduitStatsId(e.target.value)}
      >
        <option value="">Sélectionner un produit</option>
        {produits.map((produit) => (
          <option key={produit.id} value={produit.id}>
            {produit.nom} ({produit.reference})
          </option>
        ))}
      </select>
    </div>
  </div>

  {!selectedProduitStatsId ? (
    <div className="product-stats-empty">
      Choisissez un produit pour afficher ses statistiques.
    </div>
  ) : !produitStats ? (
    <div className="product-stats-empty">Aucune statistique disponible.</div>
  ) : (
    <div className="product-stats-grid">
      <article className="product-stat-box product-stat-highlight">
        <div className="product-stat-label">Produit</div>
        <div className="product-stat-value">
          {produitStats.produit?.nom || '-'}
        </div>
        <div className="product-stat-meta">
          Réf : {produitStats.produit?.reference || '-'}
        </div>
      </article>

      <article className="product-stat-box">
        <div className="product-stat-label">Nombre de ventes</div>
        <div className="product-stat-value">{produitStats.nombreVentes}</div>
        <div className="product-stat-meta">
          Nombre de ventes contenant ce produit
        </div>
      </article>

      <article className="product-stat-box">
        <div className="product-stat-label">Quantité vendue</div>
        <div className="product-stat-value">{produitStats.quantiteVendue}</div>
        <div className="product-stat-meta">Quantité totale vendue</div>
      </article>

      <article className="product-stat-box">
        <div className="product-stat-label">Montant articles</div>
        <div className="product-stat-value">
          {formatGNF(produitStats.totalArticles)}
        </div>
        <div className="product-stat-meta">
          Total des articles vendus pour ce produit
        </div>
      </article>

      <article className="product-stat-box">
        <div className="product-stat-label">Livraison imputée</div>
        <div className="product-stat-value">
          {formatGNF(produitStats.totalLivraison)}
        </div>
        <div className="product-stat-meta">
          Part estimée des frais de livraison
        </div>
      </article>

      <article className="product-stat-box">
        <div className="product-stat-label">Total facturé</div>
        <div className="product-stat-value">
          {formatGNF(produitStats.totalFacture)}
        </div>
        <div className="product-stat-meta">Articles + part de livraison</div>
      </article>

      <article className="product-stat-box">
        <div className="product-stat-label">Bénéfice estimé</div>
        <div className="product-stat-value">
          {formatGNF(produitStats.beneficeTotal)}
        </div>
        <div className="product-stat-meta">
          Calcul basé sur les ventes enregistrées
        </div>
      </article>
    </div>
  )}
</section>
      <section className="page-card">
        <div className="section-head">
          <div>
            <h2>Liste des ventes</h2>
            <p>Historique des ventes enregistrées pour votre entreprise.</p>
          </div>
        </div>

        {loading ? (
          <p>Chargement des ventes...</p>
        ) : ventes.length === 0 ? (
          <p>Aucune vente enregistrée pour le moment.</p>
        ) : (
          <>
            <div className="table-wrap ventes-table-desktop">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Produits</th>
                    <th>Qté totale</th>
                    <th>Total articles</th>
                    <th>Coût total</th>
                    <th>Livraison</th>
                    <th>Total facturé</th>
                    <th>Bénéfice net</th>
                    <th>Statut</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ventes.map((vente) => (
                    <tr key={vente.id}>
                      <td>{formatClientName(vente)}</td>
                      <td>
                        <div className="sale-products-list">
                          {vente.lignes.map((ligne, idx) => (
                            <div key={idx}>
                              {ligne.nomProduit} ({ligne.referenceProduit || '-'}) x {ligne.quantite}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>{vente.quantite_totale}</td>
                      <td>{formatGNF(vente.total_articles)}</td>
                      <td>{formatGNF(vente.cout_total_vente)}</td>
                      <td>{formatGNF(vente.fraisLivraison)}</td>
                      <td>{formatGNF(vente.total_vente)}</td>
                      <td>{formatGNF(vente.benefice)}</td>
                      <td>{formatStatut(vente.statut)}</td>
                      <td>{formatDate(vente.dateAchat)}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="table-action-btn edit"
                            onClick={() => handleEdit(vente)}
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            className="table-action-btn delete"
                            onClick={() => openDeleteModal(vente)}
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ventes-mobile-list">
              {ventes.map((vente) => {
                const isExpanded = expandedSaleId === vente.id;

                return (
                  <article key={vente.id} className="mobile-sale-card compact">
                    <div className="mobile-sale-head compact">
                      <div className="mobile-sale-head-text">
                        <h3>{formatClientName(vente)}</h3>
                        <p>{vente.lignes.length} produit(s)</p>
                      </div>

                      <div className={`sale-status-badge ${vente.statut || ''}`}>
                        {formatStatut(vente.statut)}
                      </div>
                    </div>

                    <div className="mobile-sale-compact-row">
                      <div className="mobile-sale-compact-item">
                        <span>Total facturé</span>
                        <strong>{formatGNF(vente.total_vente)}</strong>
                      </div>

                      <div className="mobile-sale-compact-item">
                        <span>Date</span>
                        <strong>{formatDate(vente.dateAchat)}</strong>
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="mobile-sale-details">
                        <div className="mobile-sale-item">
                          <span>Produits</span>
                          <strong>
                            {vente.lignes.map((ligne, idx) => (
                              <div key={idx}>
                                {ligne.nomProduit} ({ligne.referenceProduit || '-'}) x {ligne.quantite}
                              </div>
                            ))}
                          </strong>
                        </div>

                        <div className="mobile-sale-item">
                          <span>Téléphone</span>
                          <strong>{vente.telephone || '-'}</strong>
                        </div>

                        <div className="mobile-sale-item">
                          <span>Total articles</span>
                          <strong>{formatGNF(vente.total_articles)}</strong>
                        </div>

                        <div className="mobile-sale-item">
                          <span>Coût total</span>
                          <strong>{formatGNF(vente.cout_total_vente)}</strong>
                        </div>

                        <div className="mobile-sale-item">
                          <span>Livraison</span>
                          <strong>{formatGNF(vente.fraisLivraison)}</strong>
                        </div>

                        <div className="mobile-sale-item">
                          <span>Bénéfice net</span>
                          <strong>{formatGNF(vente.benefice)}</strong>
                        </div>

                        <div className="mobile-sale-item">
                          <span>Quantité totale</span>
                          <strong>{vente.quantite_totale}</strong>
                        </div>

                        <div className="mobile-sale-item mobile-sale-item-full">
                          <span>Adresse</span>
                          <strong>{vente.adresse || '-'}</strong>
                        </div>
                      </div>
                    ) : null}

                    <div className="mobile-sale-actions compact">
                      <button
                        type="button"
                        className="secondary-outline-btn mobile-detail-btn"
                        onClick={() => toggleSaleDetails(vente.id)}
                      >
                        {isExpanded ? 'Masquer les détails' : 'Voir les détails'}
                      </button>

                      <button
                        type="button"
                        className="table-action-btn edit"
                        onClick={() => handleEdit(vente)}
                      >
                        Modifier
                      </button>

                      <button
                        type="button"
                        className="table-action-btn delete"
                        onClick={() => openDeleteModal(vente)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      {deleteModalOpen ? (
        <div className="confirm-modal-overlay" onClick={closeDeleteModal}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-badge">Confirmation</div>

            <h3>Supprimer cette vente ?</h3>

            <p>
              Vous êtes sur le point de supprimer la vente de{' '}
              <strong>
                {[venteToDelete?.nomClient, venteToDelete?.prenomClient]
                  .filter(Boolean)
                  .join(' ') || 'ce client'}
              </strong>.
              Le stock des produits sera automatiquement restauré.
            </p>

            <div className="confirm-modal-actions">
              <button
                type="button"
                className="secondary-outline-btn"
                onClick={closeDeleteModal}
                disabled={deleting}
              >
                Annuler
              </button>

              <button
                type="button"
                className="danger-btn"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Suppression...' : 'Oui, supprimer'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}