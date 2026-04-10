import { useEffect, useMemo, useState } from 'react';
import { getProduits } from '../services/produitsService';
import { addMouvementStock, getMouvementsStock } from '../services/stockService';

const initialForm = {
  produit_id: '',
  type_mouvement: 'entree',
  quantite: '',
  note: '',
};

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR');
}

function formatTypeMouvement(type) {
  if (type === 'entree') return 'Entrée';
  if (type === 'sortie') return 'Sortie';
  if (type === 'ajustement') return 'Ajustement';
  return type || '-';
}

export default function StockPage() {
  const [produits, setProduits] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  async function loadData() {
    try {
      setLoading(true);
      setError('');

      const [produitsData, mouvementsData] = await Promise.all([
        getProduits(),
        getMouvementsStock(),
      ]);

      setProduits(produitsData || []);
      setMouvements(mouvementsData || []);
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement du stock');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  const selectedProduit = useMemo(() => {
    return produits.find((produit) => produit.id === form.produit_id) || null;
  }, [produits, form.produit_id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      await addMouvementStock(form);
      setForm(initialForm);
      setSuccessMsg('Mouvement de stock enregistré avec succès.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Erreur lors de l’enregistrement du mouvement');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="page-card">
        <div className="section-head">
          <div>
            <h2>Mouvement de stock</h2>
            <p>Ajoutez une entrée, une sortie ou un ajustement de stock.</p>
          </div>
        </div>

        <form className="product-form-grid stock-form-grid" onSubmit={handleSubmit}>
          <div className="stock-form-block stock-form-block-full">
            <div className="stock-block-title">Saisie du mouvement</div>

            <div className="stock-form-inner-grid">
              <div className="form-group">
                <label>Produit</label>
                <select
                  name="produit_id"
                  value={form.produit_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Sélectionner un produit</option>
                  {produits.map((produit) => (
                    <option key={produit.id} value={produit.id}>
                      {produit.nom} ({produit.reference})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Type de mouvement</label>
                <select
                  name="type_mouvement"
                  value={form.type_mouvement}
                  onChange={handleChange}
                  required
                >
                  <option value="entree">Entrée</option>
                  <option value="sortie">Sortie</option>
                  <option value="ajustement">Ajustement</option>
                </select>
              </div>

              <div className="form-group">
                <label>Quantité</label>
                <input
                  type="number"
                  name="quantite"
                  placeholder="Ex: 5"
                  min="0"
                  value={form.quantite}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Note</label>
                <input
                  type="text"
                  name="note"
                  placeholder="Ex: Réapprovisionnement"
                  value={form.note}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="stock-live-summary">
              <div className="stock-live-item">
                <span>Produit sélectionné</span>
                <strong>{selectedProduit?.nom || 'Aucun produit'}</strong>
              </div>

              <div className="stock-live-item">
                <span>Référence</span>
                <strong>{selectedProduit?.reference || '-'}</strong>
              </div>

              <div className="stock-live-item">
                <span>Stock actuel</span>
                <strong>{selectedProduit?.stock ?? '-'}</strong>
              </div>

              <div className="stock-live-item">
                <span>Type choisi</span>
                <strong>{formatTypeMouvement(form.type_mouvement)}</strong>
              </div>
            </div>
          </div>

          {error ? <p className="error-text">{error}</p> : null}
          {successMsg ? <p className="success-text">{successMsg}</p> : null}

          <div className="form-actions">
            <button className="primary-btn" type="submit" disabled={submitting}>
              {submitting ? 'Enregistrement...' : 'Enregistrer le mouvement'}
            </button>
          </div>
        </form>
      </section>

      <section className="page-card">
        <div className="section-head">
          <div>
            <h2>Historique des mouvements</h2>
            <p>Suivi des entrées, sorties et ajustements de stock.</p>
          </div>
        </div>

        {loading ? (
          <p>Chargement des mouvements...</p>
        ) : mouvements.length === 0 ? (
          <p>Aucun mouvement de stock enregistré pour le moment.</p>
        ) : (
          <>
            <div className="table-wrap stock-table-desktop">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Référence</th>
                    <th>Type</th>
                    <th>Quantité</th>
                    <th>Note</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {mouvements.map((mouvement) => (
                    <tr key={mouvement.id}>
                      <td>{mouvement.produits?.nom || '-'}</td>
                      <td>{mouvement.produits?.reference || '-'}</td>
                      <td>{formatTypeMouvement(mouvement.type_mouvement)}</td>
                      <td>{mouvement.quantite ?? 0}</td>
                      <td>{mouvement.note || '-'}</td>
                      <td>{formatDate(mouvement.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="stock-mobile-list">
              {mouvements.map((mouvement) => (
                <article key={mouvement.id} className="mobile-stock-card">
                  <div className="mobile-stock-head">
                    <div className="mobile-stock-head-text">
                      <h3>{mouvement.produits?.nom || 'Produit'}</h3>
                      <p>Réf : {mouvement.produits?.reference || '-'}</p>
                    </div>

                    <div className={`stock-type-badge ${mouvement.type_mouvement || ''}`}>
                      {formatTypeMouvement(mouvement.type_mouvement)}
                    </div>
                  </div>

                  <div className="mobile-stock-grid">
                    <div className="mobile-stock-item">
                      <span>Quantité</span>
                      <strong>{mouvement.quantite ?? 0}</strong>
                    </div>

                    <div className="mobile-stock-item">
                      <span>Date</span>
                      <strong>{formatDate(mouvement.created_at)}</strong>
                    </div>

                    <div className="mobile-stock-item mobile-stock-item-full">
                      <span>Note</span>
                      <strong>{mouvement.note || '-'}</strong>
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