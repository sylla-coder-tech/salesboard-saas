import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { getMyProfile } from '../../auth/services/profileService';
import { getProduits } from '../../produits/services/produitsService';
import {
  addCreditClient,
  addRemboursementCredit,
  getCreditsClients,
  getRemboursementsCredit,
} from '../services/creditsService';

function formatGNF(value) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0)) + ' GNF';
}

const initialCreditForm = {
  client_id: '',
  produit_id: '',
  montant_credit: '',
  montant_verse: '',
  date_credit: '',
  note: '',
};

const initialRemboursementForm = {
  credit_client_id: '',
  montant: '',
  mode_paiement: 'espèces',
  date_remboursement: '',
  note: '',
};

export default function CreditsPage() {
  const [clients, setClients] = useState([]);
  const [produits, setProduits] = useState([]);
  const [credits, setCredits] = useState([]);
  const [remboursements, setRemboursements] = useState([]);

  const [creditForm, setCreditForm] = useState(initialCreditForm);
  const [remboursementForm, setRemboursementForm] = useState(initialRemboursementForm);

  const [loading, setLoading] = useState(true);
  const [submittingCredit, setSubmittingCredit] = useState(false);
  const [submittingRemboursement, setSubmittingRemboursement] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  async function getClientsDirectement() {
    const profile = await getMyProfile();

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('entreprise_id', profile.entreprise_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const clientsData = await getClientsDirectement();
      setClients(clientsData || []);
    } catch (err) {
      console.error('Erreur chargement clients :', err);
      setClients([]);
      setError((prev) =>
        prev
          ? `${prev} | Clients: ${err.message || 'Erreur'}`
          : `Clients: ${err.message || 'Erreur'}`
      );
    }

    try {
      const produitsData = await getProduits();
      setProduits(produitsData || []);
    } catch (err) {
      console.error('Erreur chargement produits :', err);
      setProduits([]);
      setError((prev) =>
        prev
          ? `${prev} | Produits: ${err.message || 'Erreur'}`
          : `Produits: ${err.message || 'Erreur'}`
      );
    }

    try {
      const creditsData = await getCreditsClients();
      setCredits(creditsData || []);
    } catch (err) {
      console.error('Erreur chargement crédits :', err);
      setCredits([]);
      setError((prev) =>
        prev
          ? `${prev} | Crédits: ${err.message || 'Erreur'}`
          : `Crédits: ${err.message || 'Erreur'}`
      );
    }

    try {
      const remboursementsData = await getRemboursementsCredit();
      setRemboursements(remboursementsData || []);
    } catch (err) {
      console.error('Erreur chargement remboursements :', err);
      setRemboursements([]);
      setError((prev) =>
        prev
          ? `${prev} | Remboursements: ${err.message || 'Erreur'}`
          : `Remboursements: ${err.message || 'Erreur'}`
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleCreditChange(e) {
    const { name, value } = e.target;
    setCreditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleRemboursementChange(e) {
    const { name, value } = e.target;
    setRemboursementForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  const selectedClient = useMemo(() => {
    return clients.find((client) => String(client.id) === String(creditForm.client_id)) || null;
  }, [clients, creditForm.client_id]);

  const selectedProduit = useMemo(() => {
    return produits.find((produit) => String(produit.id) === String(creditForm.produit_id)) || null;
  }, [produits, creditForm.produit_id]);

  const montantCredit = Number(creditForm.montant_credit || 0);
  const montantVerse = Number(creditForm.montant_verse || 0);
  const montantRestant = Math.max(montantCredit - montantVerse, 0);

  function getProduitNomById(produitId) {
    const produit = produits.find((item) => String(item.id) === String(produitId));
    return produit?.nom || '-';
  }

  async function handleCreditSubmit(e) {
    e.preventDefault();
    setSubmittingCredit(true);
    setError('');
    setSuccessMsg('');

    try {
      await addCreditClient(creditForm);
      setCreditForm(initialCreditForm);
      setSuccessMsg('Crédit enregistré avec succès.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Erreur lors de l’enregistrement du crédit');
    } finally {
      setSubmittingCredit(false);
    }
  }

  async function handleRemboursementSubmit(e) {
    e.preventDefault();
    setSubmittingRemboursement(true);
    setError('');
    setSuccessMsg('');

    try {
      await addRemboursementCredit(remboursementForm);
      setRemboursementForm(initialRemboursementForm);
      setSuccessMsg('Remboursement enregistré avec succès.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Erreur lors de l’enregistrement du remboursement');
    } finally {
      setSubmittingRemboursement(false);
    }
  }

  return (
    <>
      <section className="page-card">
        <div className="section-head">
          <div>
            <h2>Ajouter un crédit client</h2>
            <p>Enregistrez une vente à crédit avec acompte éventuel.</p>
          </div>
        </div>

        <form className="sales-form-grid" onSubmit={handleCreditSubmit}>
          <div className="page-card" style={{ padding: '18px', gridColumn: '1 / -1' }}>
            <h3 style={{ marginTop: 0 }}>Informations du crédit</h3>

            <div className="sales-form-grid">
              <div className="form-group">
                <label>Client</label>
                <select
                  name="client_id"
                  value={creditForm.client_id}
                  onChange={handleCreditChange}
                  required
                >
                  <option value="">Sélectionner un client</option>
                  {clients.length === 0 ? (
                    <option value="" disabled>Aucun client trouvé</option>
                  ) : (
                    clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {[client.nom, client.prenom].filter(Boolean).join(' ')}
                        {client.telephone ? ` - ${client.telephone}` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="form-group">
                <label>Produit (optionnel)</label>
                <select
                  name="produit_id"
                  value={creditForm.produit_id}
                  onChange={handleCreditChange}
                >
                  <option value="">Aucun produit</option>
                  {produits.map((produit) => (
                    <option key={produit.id} value={produit.id}>
                      {produit.nom} ({produit.reference})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Montant du crédit</label>
                <input
                  type="number"
                  name="montant_credit"
                  placeholder="Ex: 800000"
                  min="0"
                  value={creditForm.montant_credit}
                  onChange={handleCreditChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Montant versé au départ</label>
                <input
                  type="number"
                  name="montant_verse"
                  placeholder="Ex: 200000"
                  min="0"
                  value={creditForm.montant_verse}
                  onChange={handleCreditChange}
                />
              </div>

              <div className="form-group">
                <label>Date du crédit</label>
                <input
                  type="datetime-local"
                  name="date_credit"
                  value={creditForm.date_credit}
                  onChange={handleCreditChange}
                />
              </div>

              <div className="form-group">
                <label>Note</label>
                <input
                  type="text"
                  name="note"
                  placeholder="Ex: Paiement prévu fin du mois"
                  value={creditForm.note}
                  onChange={handleCreditChange}
                />
              </div>
            </div>

            <div
              className="facture-live-summary"
              style={{ marginTop: '16px', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}
            >
              <div className="facture-live-item">
                <span>Client choisi</span>
                <strong>
                  {selectedClient
                    ? [selectedClient.nom, selectedClient.prenom].filter(Boolean).join(' ')
                    : 'Aucun client'}
                </strong>
              </div>

              <div className="facture-live-item">
                <span>Produit</span>
                <strong>{selectedProduit?.nom || 'Aucun produit'}</strong>
              </div>

              <div className="facture-live-item">
                <span>Montant crédit</span>
                <strong>{formatGNF(montantCredit)}</strong>
              </div>

              <div className="facture-live-item">
                <span>Reste à payer</span>
                <strong>{formatGNF(montantRestant)}</strong>
              </div>
            </div>
          </div>

          {error ? <p className="error-text">{error}</p> : null}
          {successMsg ? <p className="success-text">{successMsg}</p> : null}

          <div className="form-actions">
            <button className="primary-btn" type="submit" disabled={submittingCredit}>
              {submittingCredit ? 'Enregistrement...' : 'Enregistrer le crédit'}
            </button>
          </div>
        </form>
      </section>

      <section className="page-card">
        <div className="section-head">
          <div>
            <h2>Enregistrer un remboursement</h2>
            <p>Ajoutez un remboursement partiel ou total sur un crédit existant.</p>
          </div>
        </div>

        <form className="sales-form-grid" onSubmit={handleRemboursementSubmit}>
          <div className="form-group">
            <label>Crédit concerné</label>
            <select
              name="credit_client_id"
              value={remboursementForm.credit_client_id}
              onChange={handleRemboursementChange}
              required
            >
              <option value="">Sélectionner un crédit</option>
              {credits
                .filter((credit) => Number(credit.reste_a_payer || 0) > 0)
                .map((credit) => (
                  <option key={credit.id} value={credit.id}>
                    {[credit.clients?.nom, credit.clients?.prenom]
                      .filter(Boolean)
                      .join(' ')} - Reste: {formatGNF(credit.reste_a_payer)}
                  </option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label>Montant remboursé</label>
            <input
              type="number"
              name="montant"
              placeholder="Ex: 100000"
              min="0"
              value={remboursementForm.montant}
              onChange={handleRemboursementChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Mode de paiement</label>
            <select
              name="mode_paiement"
              value={remboursementForm.mode_paiement}
              onChange={handleRemboursementChange}
              required
            >
              <option value="espèces">Espèces</option>
              <option value="orange money">Orange Money</option>
              <option value="mobile money">Mobile Money</option>
              <option value="virement">Virement</option>
              <option value="carte">Carte</option>
              <option value="chèque">Chèque</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          <div className="form-group">
            <label>Date du remboursement</label>
            <input
              type="datetime-local"
              name="date_remboursement"
              value={remboursementForm.date_remboursement}
              onChange={handleRemboursementChange}
            />
          </div>

          <div className="form-group">
            <label>Note</label>
            <input
              type="text"
              name="note"
              placeholder="Ex: Versement partiel"
              value={remboursementForm.note}
              onChange={handleRemboursementChange}
            />
          </div>

          <div className="form-actions">
            <button
              className="primary-btn"
              type="submit"
              disabled={submittingRemboursement}
            >
              {submittingRemboursement ? 'Enregistrement...' : 'Enregistrer le remboursement'}
            </button>
          </div>
        </form>
      </section>

      <section className="page-card">
        <div className="section-head">
          <div>
            <h2>Liste des crédits</h2>
            <p>Suivi des crédits clients en cours et soldés.</p>
          </div>
        </div>

        {loading ? (
          <p>Chargement des crédits...</p>
        ) : credits.length === 0 ? (
          <p>Aucun crédit enregistré pour le moment.</p>
        ) : (
          <>
            <div className="table-wrap credits-table-desktop">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Produit</th>
                    <th>Montant crédit</th>
                    <th>Montant versé</th>
                    <th>Reste à payer</th>
                    <th>Statut</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {credits.map((credit) => (
                    <tr key={credit.id}>
                      <td>
                        {[credit.clients?.nom, credit.clients?.prenom]
                          .filter(Boolean)
                          .join(' ') || '-'}
                      </td>
                      <td>{getProduitNomById(credit.produit_id)}</td>
                      <td>{formatGNF(credit.montant_total)}</td>
                      <td>{formatGNF(credit.montant_paye)}</td>
                      <td>{formatGNF(credit.reste_a_payer)}</td>
                      <td>{credit.statut || '-'}</td>
                      <td>
                        {credit.date_credit
                          ? new Date(credit.date_credit).toLocaleDateString('fr-FR')
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="credits-mobile-list">
              {credits.map((credit) => (
                <article key={credit.id} className="mobile-credit-card">
                  <div className="mobile-credit-head">
                    <div className="mobile-credit-head-text">
                      <h3>
                        {[credit.clients?.nom, credit.clients?.prenom]
                          .filter(Boolean)
                          .join(' ') || 'Client'}
                      </h3>
                      <p>{getProduitNomById(credit.produit_id)}</p>
                    </div>

                    <div
                      className={`mobile-credit-badge ${String(credit.statut || '')
                        .replace(/\s+/g, '-')}`}
                    >
                      {credit.statut || '-'}
                    </div>
                  </div>

                  <div className="mobile-credit-grid">
                    <div className="mobile-credit-item">
                      <span>Montant crédit</span>
                      <strong>{formatGNF(credit.montant_total)}</strong>
                    </div>

                    <div className="mobile-credit-item">
                      <span>Montant versé</span>
                      <strong>{formatGNF(credit.montant_paye)}</strong>
                    </div>

                    <div className="mobile-credit-item">
                      <span>Reste à payer</span>
                      <strong>{formatGNF(credit.reste_a_payer)}</strong>
                    </div>

                    <div className="mobile-credit-item">
                      <span>Date</span>
                      <strong>
                        {credit.date_credit
                          ? new Date(credit.date_credit).toLocaleDateString('fr-FR')
                          : '-'}
                      </strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="page-card">
        <div className="section-head">
          <div>
            <h2>Historique des remboursements</h2>
            <p>Suivi chronologique des remboursements enregistrés.</p>
          </div>
        </div>

        {loading ? (
          <p>Chargement des remboursements...</p>
        ) : remboursements.length === 0 ? (
          <p>Aucun remboursement enregistré pour le moment.</p>
        ) : (
          <>
            <div className="table-wrap remboursements-table-desktop">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Produit</th>
                    <th>Montant</th>
                    <th>Date</th>
                    <th>Mode</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {remboursements.map((remboursement) => (
                    <tr key={remboursement.id}>
                      <td>
                        {[
                          remboursement.credits_clients?.clients?.nom,
                          remboursement.credits_clients?.clients?.prenom,
                        ]
                          .filter(Boolean)
                          .join(' ') || '-'}
                      </td>
                      <td>{getProduitNomById(remboursement.credits_clients?.produit_id)}</td>
                      <td>{formatGNF(remboursement.montant)}</td>
                      <td>
                        {remboursement.date_remboursement
                          ? new Date(remboursement.date_remboursement).toLocaleDateString('fr-FR')
                          : '-'}
                      </td>
                      <td>{remboursement.mode_paiement || '-'}</td>
                      <td>{remboursement.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="remboursements-mobile-list">
              {remboursements.map((remboursement) => (
                <article key={remboursement.id} className="mobile-remboursement-card">
                  <div className="mobile-remboursement-head">
                    <div className="mobile-remboursement-head-text">
                      <h3>
                        {[
                          remboursement.credits_clients?.clients?.nom,
                          remboursement.credits_clients?.clients?.prenom,
                        ]
                          .filter(Boolean)
                          .join(' ') || 'Client'}
                      </h3>
                      <p>{getProduitNomById(remboursement.credits_clients?.produit_id)}</p>
                    </div>

                    <div className="mobile-remboursement-badge">
                      {remboursement.mode_paiement || '-'}
                    </div>
                  </div>

                  <div className="mobile-remboursement-grid">
                    <div className="mobile-remboursement-item">
                      <span>Montant</span>
                      <strong>{formatGNF(remboursement.montant)}</strong>
                    </div>

                    <div className="mobile-remboursement-item">
                      <span>Date</span>
                      <strong>
                        {remboursement.date_remboursement
                          ? new Date(remboursement.date_remboursement).toLocaleDateString('fr-FR')
                          : '-'}
                      </strong>
                    </div>

                    <div className="mobile-remboursement-item mobile-remboursement-item-full">
                      <span>Note</span>
                      <strong>{remboursement.note || '-'}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}