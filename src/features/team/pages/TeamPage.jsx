import { useEffect, useState } from 'react';
import {
  getTeamMembers,
  inviteTeamMember,
  updateTeamMember,
} from '../services/teamService';

const initialForm = {
  email: '',
  role: 'vendeur',
};

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR');
}

function formatRole(role) {
  if (role === 'owner') return 'Owner';
  if (role === 'admin') return 'Admin';
  if (role === 'vendeur') return 'Vendeur';
  if (role === 'comptable') return 'Comptable';
  if (role === 'lecteur') return 'Lecteur';
  return role || '-';
}

export default function TeamPage() {
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  async function loadMembers() {
    try {
      setLoading(true);
      setError('');
      const data = await getTeamMembers();
      setMembers(data);
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des membres.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMembers();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleInvite(e) {
    e.preventDefault();
    setInviting(true);
    setError('');
    setSuccessMsg('');

    try {
      const result = await inviteTeamMember(form);

      if (result?.email_sent === false && result?.invitation_saved === true) {
        setError(
          result.message ||
            "Invitation enregistrée, mais l'email n'a pas pu être envoyé."
        );
      } else {
        setSuccessMsg(result?.message || 'Invitation envoyée avec succès.');
      }

      setForm(initialForm);
      await loadMembers();
    } catch (err) {
      setError(err.message || "Erreur lors de l'invitation.");
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(member, newRole) {
    try {
      setUpdatingId(member.id);
      setError('');
      setSuccessMsg('');

      await updateTeamMember(member.id, { role: newRole });
      setSuccessMsg('Rôle mis à jour avec succès.');
      await loadMembers();
    } catch (err) {
      setError(err.message || 'Erreur lors du changement de rôle.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleToggleStatus(member) {
    try {
      setUpdatingId(member.id);
      setError('');
      setSuccessMsg('');

      const nextStatus = member.statut === 'desactive' ? 'actif' : 'desactive';

      await updateTeamMember(member.id, { statut: nextStatus });
      setSuccessMsg('Statut du membre mis à jour avec succès.');
      await loadMembers();
    } catch (err) {
      setError(err.message || 'Erreur lors de la mise à jour du statut.');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <>
      <section className="page-card">
        <div className="section-head">
          <div>
            <h2>Équipe</h2>
            <p>Invitez et gérez les utilisateurs de votre entreprise.</p>
          </div>
        </div>

        {error ? <p className="error-text">{error}</p> : null}
        {successMsg ? <p className="success-text">{successMsg}</p> : null}

        <form className="sales-form-grid" onSubmit={handleInvite}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="Ex: employe@gmail.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Rôle</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              required
            >
              <option value="admin">Admin</option>
              <option value="vendeur">Vendeur</option>
              <option value="comptable">Comptable</option>
              <option value="lecteur">Lecteur</option>
            </select>
          </div>

          <div className="form-actions">
            <button className="primary-btn" type="submit" disabled={inviting}>
              {inviting ? 'Envoi...' : 'Inviter un membre'}
            </button>
          </div>
        </form>
      </section>

      <section className="page-card">
        <div className="section-head">
          <div>
            <h2>Membres de l’entreprise</h2>
            <p>Liste des utilisateurs internes, de leurs rôles et de leur entreprise.</p>
          </div>
        </div>

        {loading ? (
          <p>Chargement des membres...</p>
        ) : members.length === 0 ? (
          <p>Aucun membre enregistré pour le moment.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Membre</th>
                  <th>Entreprise</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th>Invitation</th>
                  <th>Activation</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <strong>
                        {member.profils?.nom_complet || 'Utilisateur sans nom'}
                      </strong>
                    </td>

                    <td>{member.entreprises?.nom || 'Entreprise inconnue'}</td>

                    <td>{formatRole(member.role)}</td>

                    <td>{member.statut || '-'}</td>

                    <td>{formatDate(member.date_invitation)}</td>

                    <td>{formatDate(member.date_activation)}</td>

                    <td>
                      <div className="table-actions">
                        <select
                          value={member.role}
                          disabled={updatingId === member.id}
                          onChange={(e) => handleRoleChange(member, e.target.value)}
                        >
                          <option value="admin">Admin</option>
                          <option value="vendeur">Vendeur</option>
                          <option value="comptable">Comptable</option>
                          <option value="lecteur">Lecteur</option>
                        </select>

                        <button
                          type="button"
                          className="table-action-btn delete"
                          disabled={updatingId === member.id}
                          onClick={() => handleToggleStatus(member)}
                        >
                          {member.statut === 'desactive' ? 'Réactiver' : 'Désactiver'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}