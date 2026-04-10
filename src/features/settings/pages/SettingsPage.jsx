import { useEffect, useState } from 'react';
import { useAuthContextData } from '../../auth/services/useAuthContext';
import {
  getEntrepriseSettings,
  updateEntrepriseSettings,
} from '../services/settingsService';

export default function SettingsPage() {
  const { entreprise } = useAuthContextData();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [logoFile, setLogoFile] = useState(null);

  const [form, setForm] = useState({
    nom: '',
    telephone: '',
    adresse: '',
    description: '',
    logo_url: '',
    currentLogoUrl: '',
  });

  useEffect(() => {
    async function loadEntreprise() {
      try {
        setLoading(true);
        setError('');

        const data = await getEntrepriseSettings();

        setForm({
          nom: data?.nom || '',
          telephone: data?.telephone || '',
          adresse: data?.adresse || '',
          description: data?.description || '',
          logo_url: data?.logo_url || '',
          currentLogoUrl: data?.logo_url || '',
        });

        setLogoPreview(data?.logo_url || '');
      } catch (err) {
        setError(err.message || 'Erreur lors du chargement des paramètres.');
      } finally {
        setLoading(false);
      }
    }

    loadEntreprise();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleLogoChange(e) {
    const file = e.target.files?.[0] || null;
    setLogoFile(file);

    if (!file) {
      setLogoPreview(form.currentLogoUrl || '');
      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      setLogoPreview(reader.result || '');
    };

    reader.readAsDataURL(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      const updated = await updateEntrepriseSettings({
        ...form,
        logoFile,
      });

      setForm({
        nom: updated?.nom || '',
        telephone: updated?.telephone || '',
        adresse: updated?.adresse || '',
        description: updated?.description || '',
        logo_url: updated?.logo_url || '',
        currentLogoUrl: updated?.logo_url || '',
      });

      setLogoPreview(updated?.logo_url || '');
      setLogoFile(null);
      setSuccessMsg('Paramètres enregistrés avec succès.');
    } catch (err) {
      setError(err.message || 'Erreur lors de la mise à jour des paramètres.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page-card">
      <div className="section-head">
        <div>
          <h2>Paramètres</h2>
          <p>Configuration de l’entreprise, du logo et des informations générales.</p>
        </div>
      </div>

      {loading ? (
        <p>Chargement des paramètres...</p>
      ) : (
        <form className="settings-form-grid" onSubmit={handleSubmit}>
          <div className="settings-form-block settings-form-block-full">
            <div className="settings-block-title">Informations de l’entreprise</div>

            <div className="settings-form-inner-grid">
              <div className="form-group">
                <label>Nom de l’entreprise</label>
                <input
                  type="text"
                  name="nom"
                  placeholder="Nom de votre entreprise"
                  value={form.nom}
                  onChange={handleChange}
                  required
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

              <div className="form-group settings-full-field">
                <label>Adresse</label>
                <input
                  type="text"
                  name="adresse"
                  placeholder="Adresse complète"
                  value={form.adresse}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group settings-full-field">
                <label>Description</label>
                <textarea
                  name="description"
                  placeholder="Présentez brièvement votre activité"
                  value={form.description}
                  onChange={handleChange}
                  rows="4"
                />
              </div>
            </div>
          </div>

          <div className="settings-form-block settings-form-block-full">
            <div className="settings-block-title">Logo et aperçu</div>

            <div className="settings-form-inner-grid settings-preview-grid">
              <div className="form-group">
                <label>Logo de l’entreprise</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                />
              </div>

              <div className="settings-logo-preview-wrap">
                <label className="settings-preview-label">Aperçu</label>

                <div className="settings-logo-preview">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo entreprise" />
                  ) : (
                    <div className="settings-logo-placeholder">
                      {(form.nom || entreprise?.nom || 'E')[0].toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="settings-summary-card">
            <div className="settings-summary-head">
              <div className="settings-summary-avatar">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" />
                ) : (
                  <span>{(form.nom || entreprise?.nom || 'E')[0].toUpperCase()}</span>
                )}
              </div>

              <div className="settings-summary-text">
                <h3>{form.nom || 'Entreprise'}</h3>
                <p>{form.telephone || 'Téléphone non renseigné'}</p>
              </div>
            </div>

            <div className="settings-summary-grid">
              <div className="settings-summary-item">
                <span>Adresse</span>
                <strong>{form.adresse || '-'}</strong>
              </div>

              <div className="settings-summary-item">
                <span>Description</span>
                <strong>{form.description || '-'}</strong>
              </div>
            </div>
          </div>

          {error ? <p className="error-text">{error}</p> : null}
          {successMsg ? <p className="success-text">{successMsg}</p> : null}

          <div className="form-actions form-actions-row">
            <button className="primary-btn" type="submit" disabled={submitting}>
              {submitting ? 'Enregistrement...' : 'Enregistrer les paramètres'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}