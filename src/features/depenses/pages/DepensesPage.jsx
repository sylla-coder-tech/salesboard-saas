import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import Pagination from '../../../components/Pagination';
import { usePagination } from '../../../hooks/usePagination';
import {
  addDepense,
  deleteDepense,
  getDepenses,
  updateDepense,
} from '../services/depensesService';

function formatGNF(value) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0)) + ' GNF';
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR');
}

const categoriesDepenses = [
  'Transport',
  'Livraison',
  'Loyer',
  'Électricité',
  'Internet',
  'Salaire',
  'Achat matériel',
  'Emballage',
  'Entretien',
  'Divers',
];

const initialForm = {
  categorie: '',
  montant: '',
  description: '',
  date_depense: '',
};

export default function DepensesPage() {
  const [depenses, setDepenses] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [depenseToDelete, setDepenseToDelete] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');
  const [filterCategorie, setFilterCategorie] = useState('');

  // Filtrage
  const filteredDepenses = useMemo(() => {
    return depenses.filter((d) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        (d.categorie || '').toLowerCase().includes(q) ||
        (d.description || '').toLowerCase().includes(q);
      const matchCategorie = !filterCategorie || d.categorie === filterCategorie;
      return matchSearch && matchCategorie;
    });
  }, [depenses, search, filterCategorie]);

  // Pagination
  const pagination = usePagination(filteredDepenses, 15);

  async function loadDepenses() {
    try {
      setLoading(true);
      setError('');
      const data = await getDepenses();
      setDepenses(data || []);
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des dépenses');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDepenses();
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

  const montantFormate = useMemo(() => {
    return formatGNF(form.montant || 0);
  }, [form.montant]);

  function handleEdit(depense) {
    setEditingId(depense.id);
    setError('');
    setSuccessMsg('');
    setForm({
      categorie: depense.categorie || '',
      montant: depense.montant ?? '',
      description: depense.description || '',
      date_depense: depense.date_depense
        ? new Date(depense.date_depense).toISOString().slice(0, 16)
        : '',
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openDeleteModal(depense) {
    setDepenseToDelete(depense);
    setDeleteModalOpen(true);
    setError('');
    setSuccessMsg('');
  }

  function closeDeleteModal() {
    if (deleting) return;
    setDeleteModalOpen(false);
    setDepenseToDelete(null);
  }

  async function confirmDelete() {
    if (!depenseToDelete) return;

    try {
      setDeleting(true);
      setError('');
      setSuccessMsg('');
      await deleteDepense(depenseToDelete.id);

      if (editingId === depenseToDelete.id) {
        resetForm();
      }

      setSuccessMsg('Dépense supprimée avec succès.');
      closeDeleteModal();
      await loadDepenses();
    } catch (err) {
      setError(err.message || 'Erreur lors de la suppression de la dépense');
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
        await updateDepense(editingId, form);
        setSuccessMsg('Dépense modifiée avec succès.');
      } else {
        await addDepense(form);
        setSuccessMsg('Dépense ajoutée avec succès.');
      }

      resetForm();
      await loadDepenses();
    } catch (err) {
      setError(err.message || 'Erreur lors de l\u2019enregistrement de la dépense');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="page-card">
        <div className="section-head">
          <div>
            <h2>{editingId ? 'Modifier une dépense' : 'Ajouter une dépense'}</h2>
            <p>
              {editingId
                ? 'Modifiez les informations de la dépense sélectionnée.'
                : 'Enregistrez une nouvelle dépense de l\u2019entreprise.'}
            </p>
          </div>
        </div>

        <form className="sales-form-grid depenses-form-grid" onSubmit={handleSubmit}>
          <div className="depenses-form-block depenses-form-block-full">
            <div className="depenses-block-title">Informations de la dépense</div>

            <div className="depenses-form-inner-grid">
              <div className="form-group">
                <label>Catégorie</label>
                <select
                  name="categorie"
                  value={form.categorie}
                  onChange={handleChange}
                  required
                >
                  <option value="">Sélectionner une catégorie</option>
                  {categoriesDepenses.map((categorie) => (
                    <option key={categorie} value={categorie}>
                      {categorie}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Montant (GNF)</label>
                <input
                  type="number"
                  name="montant"
                  placeholder="Ex: 500000"
                  min="0"
                  value={form.montant}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Date de dépense</label>
                <input
                  type="datetime-local"
                  name="date_depense"
                  value={form.date_depense}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  name="description"
                  placeholder="Ex: Achat d\u2019emballages"
                  value={form.description}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="depense-live-summary">
              <div className="depense-live-item">
                <span>Catégorie choisie</span>
                <strong>{form.categorie || '-'}</strong>
              </div>

              <div className="depense-live-item">
                <span>Montant</span>
                <strong>{montantFormate}</strong>
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
                : 'Ajouter la dépense'}
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
            <h2>Liste des dépenses</h2>
            <p>Historique des dépenses enregistrées pour votre entreprise.</p>
          </div>
        </div>

        <div className="list-toolbar">
          <div className="search-input-wrap">
            <Search size={16} className="search-input-icon" />
            <input
              type="text"
              placeholder="Rechercher par catégorie ou description..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); pagination.resetPage(); }}
            />
          </div>
          <select
            className="list-filter-select"
            value={filterCategorie}
            onChange={(e) => { setFilterCategorie(e.target.value); pagination.resetPage(); }}
          >
            <option value="">Toutes les catégories</option>
            {categoriesDepenses.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <span className="list-count-badge">
            {filteredDepenses.length} dépense{filteredDepenses.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <p>Chargement des dépenses...</p>
        ) : depenses.length === 0 ? (
          <p>Aucune dépense enregistrée pour le moment.</p>
        ) : filteredDepenses.length === 0 ? (
          <p>{search || filterCategorie ? 'Aucune dépense ne correspond à votre recherche.' : 'Aucune dépense enregistrée pour le moment.'}</p>
        ) : (
          <>
            <div className="table-wrap depenses-table-desktop">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Catégorie</th>
                    <th>Montant</th>
                    <th>Description</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagination.paginatedItems.map((depense) => (
                    <tr key={depense.id}>
                      <td>{depense.categorie || '-'}</td>
                      <td>{formatGNF(depense.montant)}</td>
                      <td>{depense.description || '-'}</td>
                      <td>{formatDate(depense.date_depense)}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="table-action-btn edit"
                            onClick={() => handleEdit(depense)}
                          >
                            Modifier
                          </button>

                          <button
                            type="button"
                            className="table-action-btn delete"
                            onClick={() => openDeleteModal(depense)}
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

            <div className="depenses-mobile-list">
              {pagination.paginatedItems.map((depense) => (
                <article key={depense.id} className="mobile-depense-card">
                  <div className="mobile-depense-head">
                    <div className="mobile-depense-head-text">
                      <h3>{depense.categorie || 'Dépense'}</h3>
                      <p>{formatGNF(depense.montant)}</p>
                    </div>
                  </div>

                  <div className="mobile-depense-grid">
                    <div className="mobile-depense-item">
                      <span>Date</span>
                      <strong>{formatDate(depense.date_depense)}</strong>
                    </div>

                    <div className="mobile-depense-item mobile-depense-item-full">
                      <span>Description</span>
                      <strong>{depense.description || '-'}</strong>
                    </div>
                  </div>

                  <div className="mobile-depense-actions">
                    <button
                      type="button"
                      className="table-action-btn edit"
                      onClick={() => handleEdit(depense)}
                    >
                      Modifier
                    </button>

                    <button
                      type="button"
                      className="table-action-btn delete"
                      onClick={() => openDeleteModal(depense)}
                    >
                      Supprimer
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={filteredDepenses.length}
              pageSize={pagination.pageSize}
              onPrev={pagination.prevPage}
              onNext={pagination.nextPage}
              onGoTo={pagination.goToPage}
            />
          </>
        )}
      </section>

      {deleteModalOpen ? (
        <div className="confirm-modal-overlay" onClick={closeDeleteModal}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-badge">Confirmation</div>

            <h3>Supprimer cette dépense ?</h3>

            <p>
              Vous êtes sur le point de supprimer la dépense{' '}
              <strong>{depenseToDelete?.categorie || 'sélectionnée'}</strong>.
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
