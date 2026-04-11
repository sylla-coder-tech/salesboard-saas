import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createEntrepriseSaas,
  getPlansAbonnement,
  getEntreprisesSaas,
  inviteCompanyOwner,
  updateEntreprisePlan,
  updateEntrepriseStatus,
} from '../../settings/services/adminSaasService';

const initialForm = {
  nom: '',
  telephone: '',
  adresse: '',
  description: '',
  plan_id: '',
  statut_abonnement: 'essai',
  date_fin_abonnement: '',
};

const initialInviteForm = {
  entreprise_id: '',
  email: '',
  role: 'owner',
};

function normalizeId(value) {
  return String(value ?? '').trim();
}

function getPlanLabel(plan) {
  if (!plan) return '-';
  return plan.nom_plan || plan.nom || plan.code_plan || plan.code || '-';
}

function getPlanCode(plan) {
  return plan?.code_plan || plan?.code || '';
}

function getPlanMaxUsers(plan) {
  if (!plan) return '-';

  return (
    plan.max_utilisateurs ??
    plan.max_utilisateur ??
    (getPlanCode(plan) === 'premium'
      ? 50
      : getPlanCode(plan) === 'pro'
      ? 10
      : getPlanCode(plan) === 'basic'
      ? 3
      : '-')
  );
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR');
}

export default function AdminSaasPage() {
  const [plans, setPlans] = useState([]);
  const [entreprises, setEntreprises] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [inviteForm, setInviteForm] = useState(initialInviteForm);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [changingPlanId, setChangingPlanId] = useState(null);
  const [changingStatusId, setChangingStatusId] = useState(null);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  async function loadData() {
    try {
      setLoading(true);
      setError('');

      const [plansData, entreprisesData] = await Promise.all([
        getPlansAbonnement(),
        getEntreprisesSaas(),
      ]);

      setPlans(plansData || []);
      setEntreprises(entreprisesData || []);

      if ((plansData || []).length > 0) {
        setForm((prev) => ({
          ...prev,
          plan_id: prev.plan_id || String(plansData[0].id),
        }));
      }
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des données SaaS.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedPlan = useMemo(() => {
    return plans.find((item) => normalizeId(item.id) === normalizeId(form.plan_id)) || null;
  }, [plans, form.plan_id]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleInviteChange(e) {
    const { name, value } = e.target;
    setInviteForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleCreateEntreprise(e) {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccessMsg('');

    try {
      const result = await createEntrepriseSaas(form);

      setSuccessMsg(result?.message || 'Entreprise créée avec succès.');

      const createdEntrepriseId = result?.data?.id || '';

      setForm({
        ...initialForm,
        plan_id: plans[0]?.id ? String(plans[0].id) : '',
      });

      setInviteForm({
        ...initialInviteForm,
        entreprise_id: createdEntrepriseId,
      });

      await loadData();
    } catch (err) {
      setError(err.message || "Erreur lors de la création de l'entreprise.");
    } finally {
      setCreating(false);
    }
  }

  async function handleInviteOwner(e) {
    e.preventDefault();
    setInviting(true);
    setError('');
    setSuccessMsg('');

    try {
      const result = await inviteCompanyOwner({
        ...inviteForm,
        role: 'owner',
      });

      if (result?.email_sent === false && result?.invitation_saved === true) {
        setError(
          result.message ||
            "Invitation enregistrée, mais l'email n'a pas pu être envoyé."
        );
      } else {
        setSuccessMsg(result?.message || 'Invitation envoyée avec succès.');
      }

      setInviteForm(initialInviteForm);
    } catch (err) {
      setError(err.message || "Erreur lors de l'envoi de l'invitation.");
    } finally {
      setInviting(false);
    }
  }

  async function handleChangePlan(entrepriseId, newPlanId) {
    try {
      setChangingPlanId(entrepriseId);
      setError('');
      setSuccessMsg('');

      const result = await updateEntreprisePlan(entrepriseId, newPlanId);

      setSuccessMsg(result?.message || 'Plan mis à jour avec succès.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Erreur lors du changement de plan.');
    } finally {
      setChangingPlanId(null);
    }
  }

  async function handleToggleStatus(entreprise) {
    const nextStatus =
      entreprise.statut_abonnement === 'suspendu' ? 'actif' : 'suspendu';

    const confirmationText =
      nextStatus === 'suspendu'
        ? 'Voulez-vous vraiment suspendre cette entreprise ?'
        : 'Voulez-vous vraiment réactiver cette entreprise ?';

    const ok = window.confirm(confirmationText);
    if (!ok) return;

    try {
      setChangingStatusId(entreprise.id);
      setError('');
      setSuccessMsg('');

      const result = await updateEntrepriseStatus(entreprise.id, nextStatus);

      setSuccessMsg(
        result?.message ||
          (nextStatus === 'suspendu'
            ? 'Entreprise suspendue avec succès.'
            : 'Entreprise réactivée avec succès.')
      );

      await loadData();
    } catch (err) {
      setError(err.message || 'Erreur lors de la mise à jour du statut.');
    } finally {
      setChangingStatusId(null);
    }
  }

  return (
    <>
      <section className="page-card">
        <div className="section-head">
          <div>
            <h2>Administration SaaS</h2>
            <p>
              Créez des entreprises, choisissez leur plan et gérez leur abonnement.
            </p>
          </div>
        </div>

        {error ? <p className="error-text">{error}</p> : null}
        {successMsg ? <p className="success-text">{successMsg}</p> : null}

        <form className="sales-form-grid" onSubmit={handleCreateEntreprise}>
          <div className="form-group">
            <label>Nom de l’entreprise</label>
            <input
              type="text"
              name="nom"
              value={form.nom}
              onChange={handleChange}
              placeholder="Ex: BautePlus"
              required
            />
          </div>

          <div className="form-group">
            <label>Téléphone</label>
            <input
              type="text"
              name="telephone"
              value={form.telephone}
              onChange={handleChange}
              placeholder="Ex: 611010102"
            />
          </div>

          <div className="form-group">
            <label>Adresse</label>
            <input
              type="text"
              name="adresse"
              value={form.adresse}
              onChange={handleChange}
              placeholder="Ex: Kipé"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Ex: ventes détails et en gros"
            />
          </div>

          <div className="form-group">
            <label>Plan</label>
            <select
              name="plan_id"
              value={form.plan_id}
              onChange={handleChange}
              required
            >
              <option value="">Sélectionner un plan</option>
              {plans.map((plan) => (
                <option key={plan.id} value={String(plan.id)}>
                  {getPlanLabel(plan)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Statut abonnement</label>
            <select
              name="statut_abonnement"
              value={form.statut_abonnement}
              onChange={handleChange}
              required
            >
              <option value="essai">Essai</option>
              <option value="actif">Actif</option>
              <option value="expire">Expiré</option>
              <option value="suspendu">Suspendu</option>
            </select>
          </div>

          <div className="form-group">
            <label>Date fin abonnement</label>
            <input
              type="date"
              name="date_fin_abonnement"
              value={form.date_fin_abonnement}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>IA incluse</label>
            <input
              type="text"
              value={
                selectedPlan
                  ? selectedPlan.ia_active
                    ? 'Oui'
                    : 'Non'
                  : '-'
              }
              readOnly
            />
          </div>

          <div className="form-group">
            <label>Utilisateurs max</label>
            <input type="text" value={getPlanMaxUsers(selectedPlan)} readOnly />
          </div>

          <div className="form-actions">
            <button className="primary-btn" type="submit" disabled={creating}>
              {creating ? 'Création...' : 'Créer l’entreprise'}
            </button>
          </div>
        </form>
      </section>

      <section className="page-card">
        <div className="section-head">
          <div>
            <h2>Inviter le propriétaire d’une entreprise</h2>
            <p>
              Envoyez une invitation email au propriétaire principal d’une entreprise cliente.
            </p>
          </div>
        </div>

        <form className="sales-form-grid" onSubmit={handleInviteOwner}>
          <div className="form-group">
            <label>Entreprise</label>
            <select
              name="entreprise_id"
              value={inviteForm.entreprise_id}
              onChange={handleInviteChange}
              required
            >
              <option value="">Sélectionner une entreprise</option>
              {entreprises.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nom}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Email du propriétaire</label>
            <input
              type="email"
              name="email"
              value={inviteForm.email}
              onChange={handleInviteChange}
              placeholder="Ex: boutiquealpha@gmail.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Rôle attribué</label>
            <input type="text" value="Owner" readOnly />
          </div>

          <div className="form-actions">
            <button className="primary-btn" type="submit" disabled={inviting}>
              {inviting ? 'Envoi...' : 'Envoyer l’invitation'}
            </button>
          </div>
        </form>
      </section>

      <section className="page-card">
        <div className="section-head">
          <div>
            <h2>Entreprises</h2>
            <p>Liste complète des entreprises avec leur plan et leur statut SaaS.</p>
          </div>
        </div>

        {loading ? (
          <p>Chargement des entreprises...</p>
        ) : entreprises.length === 0 ? (
          <p>Aucune entreprise enregistrée pour le moment.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Entreprise</th>
                  <th>Plan</th>
                  <th>Statut</th>
                  <th>Fin abonnement</th>
                  <th>Utilisateurs</th>
                  <th>IA</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entreprises.map((item) => {
                  const planOptions = plans || [];

                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.nom || '-'}</strong>
                        <br />
                        <span style={{ color: '#667085' }}>
                          {item.telephone || '-'}
                        </span>
                      </td>

                      <td>
                        {item.nom_plan ||
                          item.plan_nom ||
                          item.code_plan ||
                          item.plan_abonnement ||
                          '-'}
                      </td>

                      <td>{item.statut_abonnement || '-'}</td>

                      <td>{formatDate(item.date_fin_abonnement)}</td>

                      <td>
                        {item.nombre_membres ?? 0} /{' '}
                        {item.utilisateurs_max ??
                          item.max_utilisateurs ??
                          item.max_utilisateur ??
                          '-'}
                      </td>

                      <td>{item.ia_active ? 'Oui' : 'Non'}</td>

                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="table-action-btn"
                            onClick={() =>
                              setInviteForm({
                                entreprise_id: item.id,
                                email: '',
                                role: 'owner',
                              })
                            }
                          >
                            Inviter owner
                          </button>

                          <Link
                            to={`/admin-saas/invitations?entreprise_id=${item.id}`}
                            className="table-action-btn"
                          >
                            Voir invitations
                          </Link>

                          <select
                            value={
                              plans.find(
                                (plan) =>
                                  getPlanCode(plan) ===
                                  (item.plan_abonnement || item.code_plan || '')
                              )?.id
                                ? String(
                                    plans.find(
                                      (plan) =>
                                        getPlanCode(plan) ===
                                        (item.plan_abonnement || item.code_plan || '')
                                    )?.id
                                  )
                                : ''
                            }
                            disabled={changingPlanId === item.id}
                            onChange={(e) =>
                              handleChangePlan(item.id, e.target.value)
                            }
                            style={{
                              minWidth: '130px',
                              borderRadius: '10px',
                              padding: '8px 10px',
                              border: '1px solid #d0d5dd',
                              background: '#fff',
                            }}
                          >
                            {planOptions.map((plan) => (
                              <option key={plan.id} value={String(plan.id)}>
                                {getPlanLabel(plan)}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            className="table-action-btn delete"
                            disabled={changingStatusId === item.id}
                            onClick={() => handleToggleStatus(item)}
                          >
                            {changingStatusId === item.id
                              ? 'Patientez...'
                              : item.statut_abonnement === 'suspendu'
                              ? 'Réactiver'
                              : 'Suspendre'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}