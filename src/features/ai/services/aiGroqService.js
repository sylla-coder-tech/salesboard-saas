import { supabase } from '../../../lib/supabaseClient';
import { getMyProfile } from '../../auth/services/profileService';

/**
 * Récupère les données commerciales de l'entreprise pour contextualiser l'IA.
 */
async function fetchCommercialContext(period = '30days') {
  const profile = await getMyProfile();
  if (!profile?.entreprise_id) return null;

  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (period === 'today') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (period === '7days') {
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (period === '30days') {
    start.setDate(now.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (period === 'year') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  const startISO = start.toISOString();
  const endISO = end.toISOString();

  const [entrepriseRes, bilanRes, ventesRes, produitsRes, creditsRes, depensesRes] =
    await Promise.all([
      supabase
        .from('entreprises')
        .select('nom, plan_abonnement')
        .eq('id', profile.entreprise_id)
        .single(),

      supabase
        .from('bilan_entreprise')
        .select('*')
        .eq('entreprise_id', profile.entreprise_id)
        .maybeSingle(),

      // Ventes de la période — inclut le statut pour le calcul par statut
      supabase
        .from('ventes_details')
        .select('produit_id, nomProduit, referenceProduit, quantite, sous_total, cout_total, benefice_ligne, statut, total_vente')
        .eq('entreprise_id', profile.entreprise_id)
        .gte('dateAchat', startISO)
        .lte('dateAchat', endISO),

      // Produits SANS filtre de date — stock toujours en temps réel
      supabase
        .from('produits')
        .select('id, nom, reference, stock')
        .eq('entreprise_id', profile.entreprise_id),

      // Crédits non soldés — tous, pas filtrés par période
      supabase
        .from('credits_clients')
        .select('id, reste_a_payer, clients(nom, prenom)')
        .eq('entreprise_id', profile.entreprise_id)
        .gt('reste_a_payer', 0),

      supabase
        .from('depenses')
        .select('montant')
        .eq('entreprise_id', profile.entreprise_id)
        .gte('date_depense', startISO)
        .lte('date_depense', endISO),
    ]);

  // --- Calcul top 10 produits (par bénéfice) ---
  const ventesRows = ventesRes.data || [];
  const productMap = new Map();

  for (const row of ventesRows) {
    const id = row.produit_id;
    if (!productMap.has(id)) {
      productMap.set(id, {
        nom: row.nomProduit || 'Produit',
        reference: row.referenceProduit || '-',
        quantite_vendue: 0,
        chiffre_affaires: 0,
        benefice_total: 0,
      });
    }
    const item = productMap.get(id);
    item.quantite_vendue += Number(row.quantite || 0);
    item.chiffre_affaires += Number(row.sous_total || 0);
    item.benefice_total += Number(row.benefice_ligne || 0);
  }

  const topProduits = Array.from(productMap.values())
    .sort((a, b) => b.benefice_total - a.benefice_total)
    .slice(0, 10); // Top 10 au lieu de 5

  // --- Alertes stock faible — toutes (pas de limite) ---
  const alertesStock = (produitsRes.data || [])
    .filter((p) => Number(p.stock || 0) <= 5)
    .sort((a, b) => Number(a.stock) - Number(b.stock))
    .map((p) => ({ nom: p.nom, reference: p.reference, stock: p.stock }));

  // --- Top 10 crédits à relancer ---
  const alertesCredits = (creditsRes.data || [])
    .sort((a, b) => Number(b.reste_a_payer) - Number(a.reste_a_payer))
    .slice(0, 10)
    .map((c) => ({
      client_nom: [c.clients?.nom, c.clients?.prenom].filter(Boolean).join(' ') || 'Client',
      reste_a_payer: c.reste_a_payer,
    }));

  // --- Ventes par statut (dédupliquées par vente_id si disponible) ---
  const statutMap = { payee: { nombre: 0, montant: 0 }, en_attente: { nombre: 0, montant: 0 }, livree: { nombre: 0, montant: 0 } };
  const venteIdsParStatut = { payee: new Set(), en_attente: new Set(), livree: new Set() };

  for (const row of ventesRows) {
    const statut = row.statut;
    if (!statut || !(statut in statutMap)) continue;

    // La vue ventes_details expose 'id' comme identifiant de la vente
    const venteId = row.id;
    if (venteId) {
      // Compter chaque vente unique une seule fois
      if (!venteIdsParStatut[statut].has(venteId)) {
        venteIdsParStatut[statut].add(venteId);
        statutMap[statut].nombre += 1;
        statutMap[statut].montant += Number(row.total_vente || 0);
      }
    } else {
      // Fallback : sommer les sous_totaux (peut surestimer le nombre de ventes)
      statutMap[statut].montant += Number(row.sous_total || 0);
      statutMap[statut].nombre += 1;
    }
  }

  // --- Total dépenses (fallback si bilan absent) ---
  const totalDepenses = (depensesRes.data || []).reduce(
    (sum, d) => sum + Number(d.montant || 0),
    0
  );

  const bilan = bilanRes.data;
  const entreprise = entrepriseRes.data;

  const periodLabels = {
    today: "aujourd'hui",
    '7days': '7 derniers jours',
    '30days': '30 derniers jours',
    year: 'cette année',
  };

  return {
    entreprise_nom: entreprise?.nom,
    plan_abonnement: entreprise?.plan_abonnement,
    period_label: periodLabels[period] || '30 derniers jours',
    // Priorité au bilan calculé, fallback sur les calculs live
    chiffre_affaires: bilan?.chiffre_affaires ?? topProduits.reduce((s, p) => s + p.chiffre_affaires, 0),
    benefice_net: bilan?.benefice_net ?? 0,
    caisse_disponible: bilan?.caisse_disponible ?? 0,
    total_depenses: bilan?.total_depenses ?? totalDepenses,
    credits_en_cours: bilan?.credits_en_cours ?? (creditsRes.data || []).reduce((s, c) => s + Number(c.reste_a_payer || 0), 0),
    nombre_total_ventes: bilan?.nombre_total_ventes ?? ventesRows.length,
    top_produits: topProduits,
    alertes_stock: alertesStock,
    alertes_credits: alertesCredits,
    ventes_par_statut: statutMap,
  };
}

/**
 * Envoie les messages à la Edge Function ai-assistant et retourne la réponse.
 * @param {Array} messages - Historique des messages [{role, text}]
 * @param {string} period - Période pour le contexte commercial
 */
export async function askGroqAssistant(messages, period = '30days') {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    throw new Error('Session utilisateur introuvable.');
  }

  // Charger le contexte commercial
  const context = await fetchCommercialContext(period);

  const { data, error } = await supabase.functions.invoke('ai-assistant', {
    body: { messages, context },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    throw new Error(data?.error || error.message || "Erreur lors de l'appel à l'assistant IA.");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data?.answer || "Je n'ai pas pu générer une réponse.";
}
