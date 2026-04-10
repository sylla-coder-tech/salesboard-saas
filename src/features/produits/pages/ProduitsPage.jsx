import { useEffect, useState } from 'react';
import {
  addProduit,
  deleteProduit,
  getProduits,
  updateProduit,
} from '../services/produitsService';

function formatGNF(value) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0)) + ' GNF';
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR');
}

const initialForm = {
  reference: '',
  nom: '',
  prixUnitaire: '',
  stock: '',
  imageFile: null,
  currentImageUrl: '',
};

export default function ProduitsPage() {
  const [loading, setLoading] = useState(true);
  const [produits, setProduits] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [editingId, setEditingId] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [produitToDelete, setProduitToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function loadProduits() {
    try {
      setLoading(true);
      setError('');
      const data = await getProduits();
      setProduits(data || []);
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProduits();
  }, []);

  function resetForm() {
    setForm(initialForm);
    setImagePreview('');
    setEditingId(null);
  }

  function handleChange(e) {
    const { name, value, files } = e.target;

    if (name === 'imageFile') {
      const file = files?.[0] || null;

      setForm((prev) => ({
        ...prev,
        imageFile: file,
      }));

      if (file) {
        setImagePreview(URL.createObjectURL(file));
      } else {
        setImagePreview(form.currentImageUrl || '');
      }

      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleEdit(produit) {
    setEditingId(produit.id);
    setSuccessMsg('');
    setError('');
    setForm({
      reference: produit.reference || '',
      nom: produit.nom || '',
      prixUnitaire: produit.prixUnitaire ?? '',
      stock: produit.stock ?? '',
      imageFile: null,
      currentImageUrl: produit.image_url || '',
    });
    setImagePreview(produit.image_url || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openDeleteModal(produit) {
    setProduitToDelete(produit);
    setDeleteModalOpen(true);
    setError('');
    setSuccessMsg('');
  }

  function closeDeleteModal() {
    if (deleting) return;
    setDeleteModalOpen(false);
    setProduitToDelete(null);
  }

  async function confirmDelete() {
    if (!produitToDelete) return;

    try {
      setDeleting(true);
      setError('');
      setSuccessMsg('');

      await deleteProduit(produitToDelete.id);

      if (editingId === produitToDelete.id) {
        resetForm();
      }

      setSuccessMsg('Produit supprimé avec succès.');
      closeDeleteModal();
      await loadProduits();
    } catch (err) {
      setError(err.message || 'Erreur lors de la suppression du produit');
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
      if (editingId) {
        await updateProduit(editingId, form);
        setSuccessMsg('Produit modifié avec succès.');
      } else {
        await addProduit(form);
        setSuccessMsg('Produit ajouté avec succès.');
      }

      resetForm();
      await loadProduits();
    } catch (err) {
      setError(err.message || 'Erreur lors de l’enregistrement du produit');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="page-card">
        <div className="section-head">
          <div>
            <h2>{editingId ? 'Modifier le produit' : 'Ajouter un produit'}</h2>
            <p>
              {editingId
                ? 'Modifiez les informations du produit sélectionné.'
                : 'Ajoutez un nouveau produit dans le stock de votre entreprise.'}
            </p>
          </div>
        </div>

        <form className="product-form-grid produits-form-grid" onSubmit={handleSubmit}>
          <div className="produits-form-block produits-form-block-full">
            <div className="produits-block-title">Informations produit</div>

            <div className="produits-form-inner-grid">
              <div className="form-group">
                <label>Référence</label>
                <input
                  type="text"
                  name="reference"
                  placeholder="Ex: PRD-001"
                  value={form.reference}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Nom du produit</label>
                <input
                  type="text"
                  name="nom"
                  placeholder="Ex: Riz 25kg"
                  value={form.nom}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Prix unitaire (GNF)</label>
                <input
                  type="number"
                  name="prixUnitaire"
                  placeholder="Ex: 350000"
                  value={form.prixUnitaire}
                  onChange={handleChange}
                  min="0"
                  required
                />
              </div>

              <div className="form-group">
                <label>Stock initial / actuel</label>
                <input
                  type="number"
                  name="stock"
                  placeholder="Ex: 10"
                  value={form.stock}
                  onChange={handleChange}
                  min="0"
                  required
                />
              </div>
            </div>
          </div>

          <div className="produits-form-block produits-form-block-full">
            <div className="produits-block-title">Image produit</div>

            <div className="produits-form-inner-grid produits-image-grid">
              <div className="form-group product-image-field">
                <label>Image du produit (optionnel)</label>
                <input
                  type="file"
                  name="imageFile"
                  accept="image/*"
                  onChange={handleChange}
                />
              </div>

              <div className="form-group product-image-preview-wrap">
                <label>Aperçu</label>
                <div className="product-image-preview">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Aperçu produit" />
                  ) : (
                    <span>Aucune image sélectionnée</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {error ? <p className="error-text">{error}</p> : null}
          {successMsg ? <p className="success-text">{successMsg}</p> : null}

          <div className="form-actions form-actions-row">
            <button className="primary-btn" type="submit" disabled={submitting}>
              {submitting
                ? editingId
                  ? 'Modification...'
                  : 'Ajout...'
                : editingId
                ? 'Enregistrer les modifications'
                : 'Ajouter le produit'}
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

      <section className="page-card">
        <div className="section-head">
          <div>
            <h2>Produits</h2>
            <p>Liste des produits enregistrés pour votre entreprise.</p>
          </div>
        </div>

        {loading ? (
          <p>Chargement des produits...</p>
        ) : produits.length === 0 ? (
          <p>Aucun produit enregistré pour le moment.</p>
        ) : (
          <>
            <div className="table-wrap produits-table-desktop">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Référence</th>
                    <th>Nom</th>
                    <th>Prix unitaire</th>
                    <th>Stock</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {produits.map((produit) => (
                    <tr key={produit.id}>
                      <td>
                        {produit.image_url ? (
                          <img
                            src={produit.image_url}
                            alt={produit.nom || 'Produit'}
                            className="product-thumb"
                          />
                        ) : (
                          <div className="product-thumb placeholder">IMG</div>
                        )}
                      </td>
                      <td>{produit.reference || '-'}</td>
                      <td>{produit.nom || '-'}</td>
                      <td>{formatGNF(produit.prixUnitaire)}</td>
                      <td>{produit.stock ?? 0}</td>
                      <td>{formatDate(produit.created_at)}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="table-action-btn edit"
                            onClick={() => handleEdit(produit)}
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            className="table-action-btn delete"
                            onClick={() => openDeleteModal(produit)}
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

            <div className="produits-mobile-list">
              {produits.map((produit) => (
                <article key={produit.id} className="mobile-produit-card">
                  <div className="mobile-produit-head">
                    <div className="mobile-produit-thumb-wrap">
                      {produit.image_url ? (
                        <img
                          src={produit.image_url}
                          alt={produit.nom || 'Produit'}
                          className="mobile-produit-thumb"
                        />
                      ) : (
                        <div className="mobile-produit-thumb placeholder">IMG</div>
                      )}
                    </div>

                    <div className="mobile-produit-head-text">
                      <h3>{produit.nom || 'Produit'}</h3>
                      <p>Réf : {produit.reference || '-'}</p>
                    </div>
                  </div>

                  <div className="mobile-produit-grid">
                    <div className="mobile-produit-item">
                      <span>Prix unitaire</span>
                      <strong>{formatGNF(produit.prixUnitaire)}</strong>
                    </div>

                    <div className="mobile-produit-item">
                      <span>Stock</span>
                      <strong>{produit.stock ?? 0}</strong>
                    </div>

                    <div className="mobile-produit-item mobile-produit-item-full">
                      <span>Date</span>
                      <strong>{formatDate(produit.created_at)}</strong>
                    </div>
                  </div>

                  <div className="mobile-produit-actions">
                    <button
                      type="button"
                      className="table-action-btn edit"
                      onClick={() => handleEdit(produit)}
                    >
                      Modifier
                    </button>

                    <button
                      type="button"
                      className="table-action-btn delete"
                      onClick={() => openDeleteModal(produit)}
                    >
                      Supprimer
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {deleteModalOpen ? (
        <div className="confirm-modal-overlay" onClick={closeDeleteModal}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-badge">Confirmation</div>

            <h3>Supprimer ce produit ?</h3>

            <p>
              Vous êtes sur le point de supprimer{' '}
              <strong>{produitToDelete?.nom || 'ce produit'}</strong>.
              Cette action ne pourra pas être annulée.
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