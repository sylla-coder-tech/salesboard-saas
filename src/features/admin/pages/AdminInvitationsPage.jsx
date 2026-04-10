import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { deleteInvitationById } from '../../settings/services/adminSaasService';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('fr-FR');
}

export default function AdminInvitationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const entrepriseIdFromUrl = searchParams.get('entreprise_id') || '';

  const [invitations, setInvitations] = useState([]);
  const [entreprisesMap, setEntreprisesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [search, setSearch] = useState('');

  async function loadInvitations() {
    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');

      const { data: invitationsData, error: invitationsError } = await supabase
        .from('invitations_entreprise')
        .select('*')
        .order('created_at', { ascending: false });

      if (invitationsError) throw invitationsError;

      const invitationsList = invitationsData || [];
      setInvitations(invitationsList);

      const entrepriseIds = [
        ...new Set(invitationsList.map((item) => item.entreprise_id).filter(Boolean)),
      ];

      if (entrepriseIds.length > 0) {
        const { data: entreprisesData, error: entreprisesError } = await supabase
          .from('entreprises')
          .select('id, nom')
          .in('id', entrepriseIds);

        if (entreprisesError) throw entreprisesError;

        const map = {};
        (entreprisesData || []).forEach((entreprise) => {
          map[entreprise.id] = entreprise.nom;
        });

        setEntreprisesMap(map);
      } else {
        setEntreprisesMap({});
      }
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des invitations.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvitations();
  }, []);

  async function handleDelete(invitationId) {
    const ok = window.confirm('Voulez-vous vraiment supprimer cette invitation ?');
    if (!ok) return;

    try {
      setDeletingId(invitationId);
      setError('');
      setSuccessMsg('');

      const result = await deleteInvitationById(invitationId);
      setSuccessMsg(result.message || 'Invitation supprimée avec succès.');

      await loadInvitations();
    } catch (err) {
      setError(err.message || "Erreur lors de la suppression de l'invitation.");
    } finally {
      setDeletingId(null);
    }
  }

  function clearEntrepriseFilter() {
    const next = new URLSearchParams(searchParams);
    next.delete('entreprise_id');
    setSearchParams(next);
  }

  const filteredInvitations = useMemo(() => {
    let result = [...invitations];

    if (entrepriseIdFromUrl) {
      result = result.filter((item) => item.entreprise_id === entrepriseIdFromUrl);
    }

    if (statusFilter !== 'tous') {
      result = result.filter((item) => item.statut === statusFilter);
    }

    const term = search.trim().toLowerCase();
    if (term) {
      result = result.filter((item) => {
        const entrepriseNom = entreprisesMap[item.entreprise_id] || '';
        return (
          String(item.email || '').toLowerCase().includes(term) ||
          String(item.role || '').toLowerCase().includes(term) ||
          String(item.statut || '').toLowerCase().includes(term) ||
          String(entrepriseNom).toLowerCase().includes(term)
        );
      });
    }

    return result;
  }, [invitations, statusFilter, search, entreprisesMap, entrepriseIdFromUrl]);

  return (
    <section className="page-card">
      <div className="section-head">
        <div>
          <h2>Invitations SaaS</h2>
          <p>Suivi des invitations envoyées, en attente, expirées ou en erreur.</p>
        </div>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      {successMsg ? <p className="success-text">{successMsg}</p> : null}

      {entrepriseIdFromUrl ? (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 14px',
            borderRadius: '12px',
            background: '#f8f9fc',
            border: '1px solid #e4e7ec',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <span>
            Filtre entreprise actif :
            <strong> {entreprisesMap[entrepriseIdFromUrl] || entrepriseIdFromUrl}</strong>
          </span>

          <button
            type="button"
            className="secondary-outline-btn"
            onClick={clearEntrepriseFilter}
          >
            Retirer le filtre
          </button>
        </div>
      ) : null}

      <div
        style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '18px',
        }}
      >
        <div className="form-group" style={{ minWidth: '220px', marginBottom: 0 }}>
          <label>Filtrer par statut</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="tous">Tous</option>
            <option value="en_attente">En attente</option>
            <option value="acceptee">Acceptée</option>
            <option value="expiree">Expirée</option>
            <option value="annulee">Annulée</option>
          </select>
        </div>

        <div className="form-group" style={{ minWidth: '260px', flex: 1, marginBottom: 0 }}>
          <label>Recherche</label>
          <input
            type="text"
            placeholder="Email, entreprise, rôle, statut..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p>Chargement des invitations...</p>
      ) : filteredInvitations.length === 0 ? (
        <p>Aucune invitation trouvée pour ce filtre.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Entreprise</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Email envoyé</th>
                <th>Date envoi</th>
                <th>Expiration</th>
                <th>Erreur email</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvitations.map((item) => (
                <tr key={item.id}>
                  <td>{item.email || '-'}</td>
                  <td>{entreprisesMap[item.entreprise_id] || 'Entreprise inconnue'}</td>
                  <td>{item.role || '-'}</td>
                  <td>
                    <span
                      style={{
                        padding: '6px 10px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background:
                          item.statut === 'en_attente'
                            ? '#fff4e5'
                            : item.statut === 'acceptee'
                            ? '#ecfdf3'
                            : item.statut === 'expiree'
                            ? '#fef3f2'
                            : '#f2f4f7',
                        color:
                          item.statut === 'en_attente'
                            ? '#b54708'
                            : item.statut === 'acceptee'
                            ? '#067647'
                            : item.statut === 'expiree'
                            ? '#b42318'
                            : '#344054',
                      }}
                    >
                      {item.statut || '-'}
                    </span>
                  </td>
                  <td>{item.email_envoye ? 'Oui' : 'Non'}</td>
                  <td>{formatDate(item.created_at)}</td>
                  <td>{formatDate(item.expire_at)}</td>
                  <td style={{ maxWidth: 240, wordBreak: 'break-word' }}>
                    {item.email_erreur || '-'}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="table-action-btn delete"
                      disabled={deletingId === item.id}
                      onClick={() => handleDelete(item.id)}
                    >
                      {deletingId === item.id ? 'Suppression...' : 'Supprimer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}