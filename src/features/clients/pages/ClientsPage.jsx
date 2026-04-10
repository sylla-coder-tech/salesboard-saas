import { useEffect, useState } from 'react';
import {
  addClient,
  deleteClient,
  getClients,
  updateClient,
} from '../services/clientsService';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR');
}

const initialForm = {
  nom: '',
  prenom: '',
  telephone: '',
  adresse: '',
  note: '',
};

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  async function loadClients() {
    try {
      setLoading(true);
      setError('');
      const data = await getClients();
      setClients(data || []);
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
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

  function handleEdit(client) {
    setEditingId(client.id);
    setError('');
    setSuccessMsg('');
    setForm({
      nom: client.nom || '',
      prenom: client.prenom || '',
      telephone: client.telephone || '',
      adresse: client.adresse || '',
      note: client.note || '',
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openDeleteModal(client) {
    setClientToDelete(client);
    setDeleteModalOpen(true);
    setError('');
    setSuccessMsg('');
  }

  function closeDeleteModal() {
    if (deleting) return;
    setDeleteModalOpen(false);
    setClientToDelete(null);
  }

  async function confirmDelete() {
    if (!clientToDelete) return;

    try {
      setDeleting(true);
      setError('');
      setSuccessMsg('');
      await deleteClient(clientToDelete.id);

      if (editingId === clientToDelete.id) {
        resetForm();
      }

      setSuccessMsg('Client supprimé avec succès.');
      closeDeleteModal();
      await loadClients();
    } catch (err) {
      setError(err.message || 'Erreur lors de la suppression du client');
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
        await updateClient(editingId, form);
        setSuccessMsg('Client modifié avec succès.');
      } else {
        await addClient(form);
        setSuccessMsg('Client ajouté avec succès.');
      }

      resetForm();
      await loadClients();
    } catch (err) {
      setError(err.message || 'Erreur lors de l’enregistrement du client');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="page-card">
        <div className="section-head">
          <div>
            <h2>{editingId ? 'Modifier un client' : 'Ajouter un client'}</h2>
            <p>
              {editingId
                ? 'Modifiez les informations du client sélectionné.'
                : 'Ajoutez un nouveau client dans votre base.'}
            </p>
          </div>
        </div>

        <form className="product-form-grid clients-form-grid" onSubmit={handleSubmit}>
          <div className="clients-form-block clients-form-block-full">
            <div className="clients-block-title">Informations principales</div>

            <div className="clients-form-inner-grid">
              <div className="form-group">
                <label>Nom</label>
                <input
                  type="text"
                  name="nom"
                  placeholder="Nom"
                  value={form.nom}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Prénom</label>
                <input
                  type="text"
                  name="prenom"
                  placeholder="Prénom"
                  value={form.prenom}
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

          <div className="clients-form-block clients-form-block-full">
            <div className="clients-block-title">Informations complémentaires</div>

            <div className="clients-form-inner-grid">
              <div className="form-group clients-note-field">
                <label>Note</label>
                <input
                  type="text"
                  name="note"
                  placeholder="Informations complémentaires"
                  value={form.note}
                  onChange={handleChange}
                />
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
                : 'Ajouter le client'}
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
            <h2>Liste des clients</h2>
            <p>Base des clients enregistrés pour votre entreprise.</p>
          </div>
        </div>

        {loading ? (
          <p>Chargement des clients...</p>
        ) : clients.length === 0 ? (
          <p>Aucun client enregistré pour le moment.</p>
        ) : (
          <>
            <div className="table-wrap clients-table-desktop">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Prénom</th>
                    <th>Téléphone</th>
                    <th>Adresse</th>
                    <th>Note</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id}>
                      <td>{client.nom || '-'}</td>
                      <td>{client.prenom || '-'}</td>
                      <td>{client.telephone || '-'}</td>
                      <td>{client.adresse || '-'}</td>
                      <td>{client.note || '-'}</td>
                      <td>{formatDate(client.created_at)}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="table-action-btn edit"
                            onClick={() => handleEdit(client)}
                          >
                            Modifier
                          </button>

                          <button
                            type="button"
                            className="table-action-btn delete"
                            onClick={() => openDeleteModal(client)}
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

            <div className="clients-mobile-list">
              {clients.map((client) => (
                <article key={client.id} className="mobile-client-card">
                  <div className="mobile-client-head">
                    <div className="mobile-client-avatar">
                      {((client.nom || '?')[0] || '?').toUpperCase()}
                    </div>

                    <div className="mobile-client-head-text">
                      <h3>{[client.nom, client.prenom].filter(Boolean).join(' ') || 'Client'}</h3>
                      <p>{client.telephone || 'Téléphone non renseigné'}</p>
                    </div>
                  </div>

                  <div className="mobile-client-grid">
                    <div className="mobile-client-item">
                      <span>Adresse</span>
                      <strong>{client.adresse || '-'}</strong>
                    </div>

                    <div className="mobile-client-item">
                      <span>Date</span>
                      <strong>{formatDate(client.created_at)}</strong>
                    </div>

                    <div className="mobile-client-item mobile-client-item-full">
                      <span>Note</span>
                      <strong>{client.note || '-'}</strong>
                    </div>
                  </div>

                  <div className="mobile-client-actions">
                    <button
                      type="button"
                      className="table-action-btn edit"
                      onClick={() => handleEdit(client)}
                    >
                      Modifier
                    </button>

                    <button
                      type="button"
                      className="table-action-btn delete"
                      onClick={() => openDeleteModal(client)}
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

            <h3>Supprimer ce client ?</h3>

            <p>
              Vous êtes sur le point de supprimer{' '}
              <strong>
                {[clientToDelete?.nom, clientToDelete?.prenom]
                  .filter(Boolean)
                  .join(' ') || 'ce client'}
              </strong>.
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