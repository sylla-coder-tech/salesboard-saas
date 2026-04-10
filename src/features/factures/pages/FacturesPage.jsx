import { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  addFacture,
  getFactureById,
  getFactures,
  getVentesPourFactures,
} from '../services/facturesService';
import { useAuthContextData } from '../../auth/services/useAuthContext';

function formatGNF(value) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0)) + ' GNF';
}

function formatPdfGNF(value) {
  const number = Number(value || 0);
  return `${number.toLocaleString('en-US').replace(/,/g, ' ')} GNF`;
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR');
}

function toNumber(value) {
  return Number(value || 0);
}

const initialForm = {
  vente_id: '',
  date_facture: '',
  note: '',
  mode_livraison: 'facturee_client',
  montant_livraison_affiche: '',
};

async function loadImageAsDataUrl(url) {
  if (!url) return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export default function FacturesPage() {
  const { entreprise } = useAuthContextData();

  const [ventes, setVentes] = useState([]);
  const [factures, setFactures] = useState([]);
  const [selectedFacture, setSelectedFacture] = useState(null);

  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [loadingFacture, setLoadingFacture] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  async function loadData() {
    try {
      setLoading(true);
      setError('');

      const [ventesData, facturesData] = await Promise.all([
        getVentesPourFactures(),
        getFactures(),
      ]);

      setVentes(ventesData || []);
      setFactures(facturesData || []);
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des factures');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedVente = useMemo(() => {
    return ventes.find((vente) => String(vente.id) === String(form.vente_id)) || null;
  }, [ventes, form.vente_id]);

  const lignesSelectionnees = useMemo(() => {
    return selectedVente?.lignes || [];
  }, [selectedVente]);

  const livraisonAfficheeForm = useMemo(() => {
    const frais = toNumber(selectedVente?.fraisLivraison || 0);

    if (form.mode_livraison === 'incluse') return 0;
    if (form.mode_livraison === 'gratuite') return 0;
    return Number(form.montant_livraison_affiche || frais || 0);
  }, [selectedVente, form.mode_livraison, form.montant_livraison_affiche]);

  const totalFactureForm = useMemo(() => {
    const montant = toNumber((selectedVente?.total_articles ?? selectedVente?.prixAchat) || 0);
    return montant + livraisonAfficheeForm;
  }, [selectedVente, livraisonAfficheeForm]);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => {
      const next = {
        ...prev,
        [name]: value,
      };

      if (name === 'mode_livraison') {
        const frais = toNumber(selectedVente?.fraisLivraison || 0);

        if (value === 'facturee_client') {
          next.montant_livraison_affiche = String(frais || 0);
        } else {
          next.montant_livraison_affiche = '0';
        }
      }

      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      const payload = {
        ...form,
        montant_livraison_affiche: livraisonAfficheeForm,
      };

      await addFacture(payload);
      setForm(initialForm);
      setSelectedFacture(null);
      setSuccessMsg('Facture générée avec succès.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Erreur lors de la génération de la facture');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleViewFacture(factureId) {
    try {
      setLoadingFacture(true);
      setError('');
      setSuccessMsg('');
      const fullFacture = await getFactureById(factureId);
      setSelectedFacture(fullFacture);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch (err) {
      setError(err.message || 'Impossible d’afficher cette facture.');
    } finally {
      setLoadingFacture(false);
    }
  }

  function handlePrint() {
    const originalTitle = document.title;
    document.title = selectedFacture?.numero_facture || 'facture';
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 300);
  }

  function getLivraisonLabel(modeLivraison) {
    if (modeLivraison === 'incluse') return 'Livraison incluse';
    if (modeLivraison === 'gratuite') return 'Livraison offerte';
    return 'Livraison';
  }

  function getLivraisonAffichee(facture) {
    const mode = facture?.mode_livraison || 'facturee_client';
    const montant = toNumber(facture?.montant_livraison_affiche || 0);

    if (mode === 'incluse') return 0;
    if (mode === 'gratuite') return 0;
    return montant;
  }

  function getMontantArticles(facture) {
    return toNumber((facture?.ventes?.total_articles ?? facture?.ventes?.prixAchat) || 0);
  }

  function getTotalFacture(facture) {
    const montant = getMontantArticles(facture);
    return montant + getLivraisonAffichee(facture);
  }

  function buildFactureShareText(facture) {
    if (!facture) return '';

    const client =
      [facture.ventes?.nomClient, facture.ventes?.prenomClient]
        .filter(Boolean)
        .join(' ') || '-';

    const lignes = facture.ventes?.lignes || [];
    const produitsText =
      lignes.length > 0
        ? lignes
            .map((ligne) => {
              const nom = ligne.produits?.nom || 'Produit';
              const ref = ligne.produits?.reference || '-';
              return `- ${nom} (${ref}) x ${ligne.quantite} = ${formatPdfGNF(ligne.sous_total)}`;
            })
            .join('\n')
        : '-';

    const montant = getMontantArticles(facture);
    const livraison = getLivraisonAffichee(facture);
    const totalFinal = getTotalFacture(facture);

    return [
      `${entreprise?.nom || 'Entreprise'}`,
      `Facture : ${facture.numero_facture || '-'}`,
      `Client : ${client}`,
      `Articles :`,
      produitsText,
      `Montant articles : ${formatPdfGNF(montant)}`,
      `${getLivraisonLabel(facture.mode_livraison)} : ${formatPdfGNF(livraison)}`,
      `Total à payer : ${formatPdfGNF(totalFinal)}`,
      `Date : ${formatDate(facture.date_facture)}`,
      `Téléphone : ${facture.ventes?.telephone || '-'}`,
      `Adresse : ${facture.ventes?.adresse || '-'}`,
      `Note : ${facture.note || '-'}`,
    ].join('\n');
  }

  async function generateFacturePdfBlob() {
    if (!selectedFacture) {
      throw new Error('Aucune facture sélectionnée.');
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 12;
    const right = pageWidth - margin;
    let y = 12;

    const logoDataUrl = await loadImageAsDataUrl(entreprise?.logo_url || '');

    const clientNom =
      [selectedFacture.ventes?.nomClient, selectedFacture.ventes?.prenomClient]
        .filter(Boolean)
        .join(' ') || '-';

    const lignes = selectedFacture.ventes?.lignes || [];
    const montantArticles = getMontantArticles(selectedFacture);
    const livraison = getLivraisonAffichee(selectedFacture);
    const totalFinal = getTotalFacture(selectedFacture);

    if (logoDataUrl) {
      pdf.addImage(logoDataUrl, 'PNG', margin, y, 20, 20);
    } else {
      pdf.setFillColor(238, 242, 255);
      pdf.roundedRect(margin, y, 20, 20, 4, 4, 'F');
      pdf.setTextColor(29, 78, 216);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text((entreprise?.nom || 'E').charAt(0).toUpperCase(), margin + 10, y + 12, {
        align: 'center',
      });
      pdf.setTextColor(0, 0, 0);
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.text(entreprise?.nom || 'Entreprise', margin + 25, y + 6);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(entreprise?.telephone || 'Téléphone non renseigné', margin + 25, y + 12);
    pdf.text(entreprise?.adresse || 'Adresse non renseignée', margin + 25, y + 17);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text('FACTURE', right, y + 6, { align: 'right' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`N° ${selectedFacture.numero_facture || '-'}`, right, y + 12, {
      align: 'right',
    });
    pdf.text(`Date : ${formatDate(selectedFacture.date_facture)}`, right, y + 17, {
      align: 'right',
    });

    y += 28;

    pdf.setDrawColor(220, 224, 230);
    pdf.line(margin, y, right, y);
    y += 6;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('Facturé à', margin, y);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    y += 5;
    pdf.text(`Nom : ${clientNom}`, margin, y);
    y += 4.5;
    pdf.text(`Téléphone : ${selectedFacture.ventes?.telephone || '-'}`, margin, y);
    y += 4.5;
    pdf.text(`Adresse : ${selectedFacture.ventes?.adresse || '-'}`, margin, y);

    y += 7;

    const tableX = margin;
    const tableW = pageWidth - margin * 2;
    const rowH = 9;

    const colProduit = tableX + 2;
    const colRef = tableX + 78;
    const colQte = tableX + 114;
    const colPrixUnit = tableX + 132;
    const colSousTotal = tableX + 170;

    pdf.setFillColor(15, 23, 42);
    pdf.setTextColor(255, 255, 255);
    pdf.rect(tableX, y, tableW, rowH, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('Produit', colProduit, y + 6);
    pdf.text('Référence', colRef, y + 6);
    pdf.text('Qté', colQte, y + 6);
    pdf.text('Prix unit.', colPrixUnit, y + 6);
    pdf.text('Sous-total', colSousTotal, y + 6);

    y += rowH;
    pdf.setTextColor(0, 0, 0);
    pdf.setDrawColor(220, 224, 230);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);

    const safeLignes = lignes.length > 0 ? lignes : [];

    for (const ligne of safeLignes) {
      if (y > pageHeight - 45) {
        pdf.addPage();
        y = 18;
      }

      pdf.rect(tableX, y, tableW, 10);

      const nom = (ligne.produits?.nom || '-').slice(0, 26);
      const ref = (ligne.produits?.reference || '-').slice(0, 12);

      pdf.text(nom, colProduit, y + 6.5);
      pdf.text(ref, colRef, y + 6.5);
      pdf.text(String(ligne.quantite || 0), colQte + 6, y + 6.5, { align: 'right' });
      pdf.text(formatPdfGNF(ligne.prix_unitaire), colPrixUnit + 24, y + 6.5, { align: 'right' });
      pdf.text(formatPdfGNF(ligne.sous_total), right - 3, y + 6.5, { align: 'right' });

      y += 10;
    }

    y += 6;

    const totalBoxX = 116;
    const totalBoxW = right - totalBoxX;

    if (y > pageHeight - 45) {
      pdf.addPage();
      y = 18;
    }

    pdf.setDrawColor(220, 224, 230);
    pdf.roundedRect(totalBoxX, y, totalBoxW, 26, 3, 3);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('Montant articles', totalBoxX + 4, y + 7);
    pdf.text(getLivraisonLabel(selectedFacture.mode_livraison), totalBoxX + 4, y + 14);
    pdf.text('Total à payer', totalBoxX + 4, y + 21);

    pdf.setFont('helvetica', 'bold');
    pdf.text(formatPdfGNF(montantArticles), totalBoxX + totalBoxW - 4, y + 7, {
      align: 'right',
    });
    pdf.text(formatPdfGNF(livraison), totalBoxX + totalBoxW - 4, y + 14, {
      align: 'right',
    });
    pdf.text(formatPdfGNF(totalFinal), totalBoxX + totalBoxW - 4, y + 21, {
      align: 'right',
    });

    y += 34;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('Note', margin, y);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    y += 5;

    const noteText = selectedFacture.note || 'Merci pour votre confiance.';
    const splitNote = pdf.splitTextToSize(noteText, 180);
    pdf.text(splitNote, margin, y);

    y += splitNote.length * 4 + 6;

    pdf.setDrawColor(220, 224, 230);
    pdf.line(margin, y, right, y);

    y += 5;
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8);
    pdf.text('Merci pour votre confiance.', margin, y);

    return pdf.output('blob');
  }

  function getPdfFileName() {
    const numero = selectedFacture?.numero_facture || 'facture';
    return `${numero}.pdf`;
  }

  async function handleDownloadPdf() {
    try {
      setDownloadingPdf(true);
      setError('');
      setSuccessMsg('');

      const blob = await generateFacturePdfBlob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = getPdfFileName();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
      setSuccessMsg('PDF généré avec succès.');
    } catch (err) {
      setError(err.message || 'Impossible de générer le PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleSharePdf() {
    if (!selectedFacture) return;

    try {
      setSharing(true);
      setError('');
      setSuccessMsg('');

      const blob = await generateFacturePdfBlob();
      const file = new File([blob], getPdfFileName(), {
        type: 'application/pdf',
      });

      const shareData = {
        title: `Facture ${selectedFacture.numero_facture || ''}`,
        text: buildFactureShareText(selectedFacture),
        files: [file],
      };

      if (navigator.canShare && navigator.canShare(shareData) && navigator.share) {
        await navigator.share(shareData);
        setSuccessMsg('Partage lancé avec succès.');
        return;
      }

      throw new Error(
        'Le partage direct du PDF n’est pas disponible sur cet appareil. Téléchargez le PDF ou utilisez WhatsApp texte.'
      );
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setError(err.message || 'Impossible de partager le PDF.');
      }
    } finally {
      setSharing(false);
    }
  }

  function handleWhatsAppTextShare() {
    if (!selectedFacture) return;

    const shareText = buildFactureShareText(selectedFacture);
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  }

  return (
    <>
      <section className="page-card no-print">
        <div className="section-head">
          <div>
            <h2>Générer une facture</h2>
            <p>Créez une facture à partir d’une vente enregistrée.</p>
          </div>
        </div>

        <form className="sales-form-grid factures-form-grid" onSubmit={handleSubmit}>
          <div className="factures-form-block factures-form-block-full">
            <div className="factures-block-title">Informations de la facture</div>

            <div className="factures-form-inner-grid">
              <div className="form-group">
                <label>Vente</label>
                <select
                  name="vente_id"
                  value={form.vente_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Sélectionner une vente</option>
                  {ventes.map((vente) => (
                    <option key={vente.id} value={vente.id}>
                      {[vente.nomClient, vente.prenomClient].filter(Boolean).join(' ')} -{' '}
                      {formatGNF((vente.total_articles ?? vente.prixAchat) || 0)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Date de facture</label>
                <input
                  type="datetime-local"
                  name="date_facture"
                  value={form.date_facture}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Mode de livraison</label>
                <select
                  name="mode_livraison"
                  value={form.mode_livraison}
                  onChange={handleChange}
                >
                  <option value="facturee_client">Facturée au client</option>
                  <option value="incluse">Incluse dans le prix</option>
                  <option value="gratuite">Offerte / gratuite</option>
                </select>
              </div>

              {form.mode_livraison === 'facturee_client' ? (
                <div className="form-group">
                  <label>Montant livraison affiché</label>
                  <input
                    type="number"
                    name="montant_livraison_affiche"
                    min="0"
                    value={form.montant_livraison_affiche}
                    onChange={handleChange}
                    placeholder="Ex: 5000"
                  />
                </div>
              ) : null}

              <div className="form-group factures-full-field">
                <label>Note</label>
                <input
                  type="text"
                  name="note"
                  placeholder="Ex: Merci pour votre confiance"
                  value={form.note}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="facture-live-summary">
              <div className="facture-live-item">
                <span>Client choisi</span>
                <strong>
                  {selectedVente
                    ? [selectedVente.nomClient, selectedVente.prenomClient]
                        .filter(Boolean)
                        .join(' ')
                    : 'Aucune vente'}
                </strong>
              </div>

              <div className="facture-live-item">
                <span>Montant articles</span>
                <strong>{formatGNF((selectedVente?.total_articles ?? selectedVente?.prixAchat) || 0)}</strong>
              </div>

              <div className="facture-live-item">
                <span>Nombre de produits</span>
                <strong>{lignesSelectionnees.length || 0}</strong>
              </div>

              <div className="facture-live-item">
                <span>{getLivraisonLabel(form.mode_livraison)}</span>
                <strong>{formatGNF(livraisonAfficheeForm)}</strong>
              </div>

              <div className="facture-live-item">
                <span>Total à payer</span>
                <strong>{formatGNF(totalFactureForm)}</strong>
              </div>
            </div>
          </div>

          {error ? <p className="error-text">{error}</p> : null}
          {successMsg ? <p className="success-text">{successMsg}</p> : null}

          <div className="form-actions">
            <button className="primary-btn" type="submit" disabled={submitting}>
              {submitting ? 'Génération...' : 'Générer la facture'}
            </button>
          </div>
        </form>
      </section>

      <section className="page-card no-print">
        <div className="section-head">
          <div>
            <h2>Liste des factures</h2>
            <p>Historique des factures générées.</p>
          </div>
        </div>

        {loading ? (
          <p>Chargement des factures...</p>
        ) : factures.length === 0 ? (
          <p>Aucune facture générée pour le moment.</p>
        ) : (
          <>
            <div className="table-wrap factures-table-desktop">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Numéro</th>
                    <th>Client</th>
                    <th>Montant</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {factures.map((facture) => (
                    <tr key={facture.id}>
                      <td>{facture.numero_facture || '-'}</td>
                      <td>
                        {[facture.ventes?.nomClient, facture.ventes?.prenomClient]
                          .filter(Boolean)
                          .join(' ') || '-'}
                      </td>
                      <td>{formatGNF(getTotalFacture(facture))}</td>
                      <td>{formatDate(facture.date_facture)}</td>
                      <td>
                        <button
                          type="button"
                          className="table-action-btn edit"
                          onClick={() => handleViewFacture(facture.id)}
                          disabled={loadingFacture}
                        >
                          {loadingFacture ? 'Chargement...' : 'Voir'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="factures-mobile-list">
              {factures.map((facture) => (
                <article key={facture.id} className="mobile-facture-card">
                  <div className="mobile-facture-head">
                    <div className="mobile-facture-head-text">
                      <h3>{facture.numero_facture || 'Facture'}</h3>
                      <p>
                        {[facture.ventes?.nomClient, facture.ventes?.prenomClient]
                          .filter(Boolean)
                          .join(' ') || '-'}
                      </p>
                    </div>
                  </div>

                  <div className="mobile-facture-grid">
                    <div className="mobile-facture-item">
                      <span>Total</span>
                      <strong>{formatGNF(getTotalFacture(facture))}</strong>
                    </div>

                    <div className="mobile-facture-item">
                      <span>Date</span>
                      <strong>{formatDate(facture.date_facture)}</strong>
                    </div>
                  </div>

                  <div className="mobile-facture-actions">
                    <button
                      type="button"
                      className="table-action-btn edit"
                      onClick={() => handleViewFacture(facture.id)}
                      disabled={loadingFacture}
                    >
                      {loadingFacture ? 'Chargement...' : 'Voir la facture'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {selectedFacture ? (
        <>
          <section className="page-card facture-card no-print">
            <div className="facture-share-toolbar">
              <button
                className="secondary-outline-btn"
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? 'PDF...' : 'Télécharger PDF'}
              </button>

              <button
                className="secondary-outline-btn"
                type="button"
                onClick={handleSharePdf}
                disabled={sharing}
              >
                {sharing ? 'Partage...' : 'Partager PDF'}
              </button>

              <button
                className="secondary-outline-btn"
                type="button"
                onClick={handleWhatsAppTextShare}
              >
                WhatsApp texte
              </button>

              <button className="primary-btn" type="button" onClick={handlePrint}>
                Imprimer
              </button>
            </div>
          </section>

          <section className="page-card facture-card facture-preview-pro">
            <div className="facture-pro-top">
              <div className="facture-pro-brand">
                <div className="facture-brand-logo">
                  {entreprise?.logo_url ? (
                    <img src={entreprise.logo_url} alt={entreprise.nom || 'Entreprise'} />
                  ) : (
                    <span>{(entreprise?.nom || 'E')[0].toUpperCase()}</span>
                  )}
                </div>

                <div className="facture-pro-brand-text">
                  <h2>{entreprise?.nom || 'Entreprise'}</h2>
                  <p>{entreprise?.telephone || 'Téléphone non renseigné'}</p>
                  <p>{entreprise?.adresse || 'Adresse non renseignée'}</p>
                </div>
              </div>

              <div className="facture-pro-meta">
                <h3>FACTURE</h3>
                <p>
                  <strong>N° :</strong> {selectedFacture.numero_facture || '-'}
                </p>
                <p>
                  <strong>Date :</strong> {formatDate(selectedFacture.date_facture)}
                </p>
              </div>
            </div>

            <div className="facture-pro-client-box">
              <div className="facture-pro-section-title">Informations client</div>

              <div className="facture-pro-client-grid">
                <div className="facture-pro-info-card">
                  <span>Client</span>
                  <strong>
                    {[selectedFacture.ventes?.nomClient, selectedFacture.ventes?.prenomClient]
                      .filter(Boolean)
                      .join(' ') || '-'}
                  </strong>
                </div>

                <div className="facture-pro-info-card">
                  <span>Téléphone</span>
                  <strong>{selectedFacture.ventes?.telephone || '-'}</strong>
                </div>

                <div className="facture-pro-info-card facture-pro-info-card-full">
                  <span>Adresse</span>
                  <strong>{selectedFacture.ventes?.adresse || '-'}</strong>
                </div>
              </div>
            </div>

            <div className="facture-pro-product-box">
              <div className="facture-pro-section-title">Détail de la facture</div>

              <div className="facture-pro-table-wrap">
                <table className="data-table facture-table">
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th>Référence</th>
                      <th>Qté</th>
                      <th>Prix unitaire</th>
                      <th>Sous-total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedFacture.ventes?.lignes || []).map((ligne) => (
                      <tr key={ligne.id}>
                        <td>{ligne.produits?.nom || '-'}</td>
                        <td>{ligne.produits?.reference || '-'}</td>
                        <td>{ligne.quantite || 0}</td>
                        <td>{formatGNF(ligne.prix_unitaire || 0)}</td>
                        <td>{formatGNF(ligne.sous_total || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="facture-pro-mobile-summary">
                {(selectedFacture.ventes?.lignes || []).map((ligne) => (
                  <div key={ligne.id} className="facture-pro-mobile-item">
                    <span>
                      {ligne.produits?.nom || '-'} ({ligne.produits?.reference || '-'}) x {ligne.quantite || 0}
                    </span>
                    <strong>{formatGNF(ligne.sous_total || 0)}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="facture-pro-bottom">
              <div className="facture-pro-note-box">
                <div className="facture-pro-section-title">Informations complémentaires</div>
                <p>
                  <strong>Note :</strong> {selectedFacture.note || '-'}
                </p>
              </div>

              <div className="facture-pro-total-box">
                <div className="facture-pro-total-row">
                  <span>Montant articles</span>
                  <strong>{formatGNF(getMontantArticles(selectedFacture))}</strong>
                </div>

                <div className="facture-pro-total-row">
                  <span>{getLivraisonLabel(selectedFacture.mode_livraison)}</span>
                  <strong>{formatGNF(getLivraisonAffichee(selectedFacture))}</strong>
                </div>

                <div className="facture-pro-total-row total">
                  <span>Total à payer</span>
                  <strong>{formatGNF(getTotalFacture(selectedFacture))}</strong>
                </div>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}